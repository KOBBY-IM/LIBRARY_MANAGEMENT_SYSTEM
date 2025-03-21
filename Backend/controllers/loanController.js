const pool = require('../config/db');

// Helper function to get current quarter information
const getCurrentQuarterInfo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    let quarter;
    let quarterStart;
    let quarterEnd;
    
    if (month < 3) {
        quarter = 1;
        quarterStart = new Date(year, 0, 1); // Jan 1
        quarterEnd = new Date(year, 2, 31); // Mar 31
    } else if (month < 6) {
        quarter = 2;
        quarterStart = new Date(year, 3, 1); // Apr 1
        quarterEnd = new Date(year, 5, 30); // Jun 30
    } else if (month < 9) {
        quarter = 3;
        quarterStart = new Date(year, 6, 1); // Jul 1
        quarterEnd = new Date(year, 8, 30); // Sep 30
    } else {
        quarter = 4;
        quarterStart = new Date(year, 9, 1); // Oct 1
        quarterEnd = new Date(year, 11, 31); // Dec 31
    }
    
    return {
        quarter,
        year,
        quarterStart,
        quarterEnd,
        quarterLabel: `Q${quarter} ${year}`
    };
};

const borrowBook = async (req, res) => {
    const { userId, bookId } = req.body;
    console.log("Request Body:", req.body);
    
    if (!userId || !bookId) {
        console.log("Missing required fields:", { userId, bookId });
        return res.status(400).json({ 
            success: false, 
            message: 'User ID and Book ID are required' 
        });
    }

    // Calculate due date (7 days from now by default)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log("Transaction started");

        // Get current quarter info
        const quarterInfo = getCurrentQuarterInfo();
        console.log("Current quarter:", quarterInfo.quarterLabel);

        // First check the user's quarterly penalty points directly
        const [userRecord] = await connection.query(
            'SELECT quarterly_penalty_points FROM users WHERE id = ?',
            [userId]
        );
        
        // Default maxLoans if user record not found or penalty points not set
        let maxLoans = 10;
        let penaltyMessage = '';
        let penaltyPoints = 0;
        
        if (userRecord.length > 0 && userRecord[0].quarterly_penalty_points !== null) {
            penaltyPoints = userRecord[0].quarterly_penalty_points;
            
            // Apply penalty based on accumulated quarterly points
            if (penaltyPoints >= 6) {
                maxLoans = 3; // Severe penalty: only 3 books allowed
                penaltyMessage = `Severe penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            } else if (penaltyPoints >= 4) {
                maxLoans = 5; // Moderate penalty: only 5 books allowed
                penaltyMessage = `Moderate penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            } else if (penaltyPoints >= 2) {
                maxLoans = 7; // Mild penalty: 7 books allowed
                penaltyMessage = `Mild penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            }
        } else {
            // Fallback to original overdue books check if quarterly points aren't available
            const [overdueLoans] = await connection.query(
                'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE AND borrow_date >= ? AND borrow_date <= ?',
                [userId, quarterInfo.quarterStart, quarterInfo.quarterEnd]
            );
            const overdueCount = overdueLoans[0].count;
            console.log("Overdue loans count in current quarter:", overdueCount);
            
            if (overdueCount > 0) {
                // Apply penalty points based on overdue count
                penaltyPoints = overdueCount * 2; // 2 points per overdue book
                
                if (overdueCount >= 3) {
                    maxLoans = 3; // Severe penalty: only 3 books allowed
                    penaltyMessage = `Severe penalty applied: You have 3 or more overdue books this quarter (${quarterInfo.quarterLabel}). Penalty points: ${penaltyPoints}`;
                } else if (overdueCount === 2) {
                    maxLoans = 5; // Moderate penalty: only 5 books allowed
                    penaltyMessage = `Moderate penalty applied: You have 2 overdue books this quarter (${quarterInfo.quarterLabel}). Penalty points: ${penaltyPoints}`;
                } else {
                    maxLoans = 7; // Mild penalty: 7 books allowed
                    penaltyMessage = `Mild penalty applied: You have 1 overdue book this quarter (${quarterInfo.quarterLabel}). Penalty points: ${penaltyPoints}`;
                }
                
                // Record quarterly penalty points
                try {
                    await connection.query(
                        'UPDATE users SET quarterly_penalty_points = quarterly_penalty_points + ?, last_penalty_quarter = ? WHERE id = ?',
                        [penaltyPoints, quarterInfo.quarterLabel, userId]
                    );
                } catch (err) {
                    console.log("Could not update quarterly penalty points, columns might not exist:", err);
                    // Continue even if columns don't exist yet
                }
            }
        }
        
        console.log("Max loans allowed:", maxLoans);

        // Check if the user has already borrowed the maximum number of books
        const [loans] = await connection.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE',
            [userId]
        );
        console.log("Current loans count:", loans[0].count);
        
        if (loans[0].count >= maxLoans) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `You have reached the maximum number of borrowed books (${maxLoans}). ${penaltyMessage}` 
            });
        }

        // Check if the book is available
        const [book] = await connection.query('SELECT quantity FROM books WHERE id = ?', [bookId]);
        console.log("Book availability check:", book);
        
        if (!book.length || book[0].quantity < 1) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Book not available or does not exist' 
            });
        }

        // Reduce book quantity
        await connection.query('UPDATE books SET quantity = quantity - 1 WHERE id = ?', [bookId]);
        console.log("Book quantity reduced");

        // Add loan record with quarter information
        const [result] = await connection.query(
            'INSERT INTO loans (user_id, book_id, due_date, quarter) VALUES (?, ?, ?, ?)', 
            [userId, bookId, dueDate, quarterInfo.quarterLabel]
        );
        console.log("Loan created:", result);

        await connection.commit();
        console.log("Transaction committed");
        
        // Include penalty info in the response if applicable
        let responseMessage = 'Book borrowed successfully';
        if (penaltyMessage) {
            responseMessage += `. Note: ${penaltyMessage}`;
        }
        
        res.status(201).json({ 
            success: true, 
            message: responseMessage,
            loanId: result.insertId,
            maxLoansAllowed: maxLoans,
            currentLoans: loans[0].count + 1,
            dueDate: dueDate,
            penaltyPoints: penaltyPoints,
            quarter: quarterInfo.quarterLabel
        });
    } catch (err) {
        console.error("Error in borrowBook:", err);
        await connection.rollback();
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    } finally {
        connection.release();
    }
};

// Return a book
const returnBook = async (req, res) => {
    const { loanId } = req.params;
    console.log("Returning loan:", loanId);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if loan exists and belongs to the user
        const [loanCheck] = await connection.query(
            'SELECT l.*, b.title FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?', 
            [loanId]
        );
        
        if (!loanCheck.length) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Loan record not found' 
            });
        }

        // Check if book is already returned
        if (loanCheck[0].returned) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'This book has already been returned' 
            });
        }

        // Get current quarter info
        const quarterInfo = getCurrentQuarterInfo();

        // Check if the book is overdue
        const dueDate = new Date(loanCheck[0].due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        let overdueDays = 0;
        let penaltyMessage = '';
        let penaltyPoints = 0;
        
        if (isOverdue) {
            // Calculate number of days overdue
            const diffTime = Math.abs(today - dueDate);
            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Calculate penalty points (1 point per day overdue)
            penaltyPoints = overdueDays;
            
            // Record the quarterly penalty points
            try {
                await connection.query(
                    'UPDATE users SET quarterly_penalty_points = quarterly_penalty_points + ?, last_penalty_quarter = ? WHERE id = ?',
                    [penaltyPoints, quarterInfo.quarterLabel, loanCheck[0].user_id]
                );
            } catch (err) {
                console.log("Could not update quarterly penalty points, columns might not exist:", err);
                // Continue even if columns don't exist
            }
            
            // Record the late return in penalties table with quarter information
            try {
                await connection.query(
                    'INSERT INTO penalties (user_id, loan_id, overdue_days, penalty_points, penalty_date, quarter) VALUES (?, ?, ?, ?, NOW(), ?)',
                    [loanCheck[0].user_id, loanId, overdueDays, penaltyPoints, quarterInfo.quarterLabel]
                );
                penaltyMessage = `Note: This book was returned ${overdueDays} day(s) late. You received ${penaltyPoints} penalty points for Q${quarterInfo.quarter} ${quarterInfo.year}.`;
            } catch (err) {
                console.log("Penalties table might not exist yet:", err);
                // Continue even if penalties table doesn't exist yet
            }
        }

        // Mark loan as returned
        await connection.query(
            'UPDATE loans SET returned = TRUE, return_date = NOW() WHERE id = ?', 
            [loanId]
        );

        // Increase book quantity
        await connection.query(
            'UPDATE books SET quantity = quantity + 1 WHERE id = ?', 
            [loanCheck[0].book_id]
        );

        await connection.commit();
        
        res.json({ 
            success: true, 
            message: `Book "${loanCheck[0].title}" returned successfully.${isOverdue ? ' ' + penaltyMessage : ''}`,
            wasOverdue: isOverdue,
            overdueDays: overdueDays,
            penaltyPoints: penaltyPoints,
            quarter: quarterInfo.quarterLabel
        });
    } catch (err) {
        console.error("Error in returnBook:", err);
        await connection.rollback();
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    } finally {
        connection.release();
    }
};

// Get all loans for a user
const getUserLoans = async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'User ID is required' 
        });
    }

    try {
        // Get current quarter info
        const quarterInfo = getCurrentQuarterInfo();

        // Get the user's loans with more detailed information
        const [loans] = await pool.query(
            `SELECT l.id, b.title, b.author, l.borrow_date, l.due_date, l.quarter,
                    DATEDIFF(l.due_date, CURDATE()) as days_remaining,
                    CASE 
                        WHEN l.due_date < CURDATE() THEN TRUE 
                        ELSE FALSE 
                    END as is_overdue
             FROM loans l 
             JOIN books b ON l.book_id = b.id 
             WHERE l.user_id = ? AND l.returned = FALSE
             ORDER BY l.due_date ASC`, 
            [userId]
        );
        
        // Get penalty status info for current quarter
        const [overdueLoans] = await pool.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE AND borrow_date >= ? AND borrow_date <= ?',
            [userId, quarterInfo.quarterStart, quarterInfo.quarterEnd]
        );
        
        const overdueCount = overdueLoans[0].count;
        let maxLoans = 10; // Increased default max loans to 10
        
        // Calculate max loans based on quarterly penalty
        if (overdueCount >= 3) {
            maxLoans = 3;
        } else if (overdueCount === 2) {
            maxLoans = 5;
        } else if (overdueCount === 1) {
            maxLoans = 7;
        }
        
        // Get current active loans count
        const [activeLoans] = await pool.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE',
            [userId]
        );
        
        // Get user's quarterly penalty points
        let quarterlyPenaltyPoints = 0;
        let lastPenaltyQuarter = '';
        try {
            const [userPenalty] = await pool.query(
                'SELECT quarterly_penalty_points, last_penalty_quarter FROM users WHERE id = ?',
                [userId]
            );
            if (userPenalty.length > 0) {
                if (userPenalty[0].quarterly_penalty_points) {
                    quarterlyPenaltyPoints = userPenalty[0].quarterly_penalty_points;
                }
                if (userPenalty[0].last_penalty_quarter) {
                    lastPenaltyQuarter = userPenalty[0].last_penalty_quarter;
                }
            }
        } catch (err) {
            console.log("Could not fetch quarterly penalty points, columns might not exist:", err);
        }
        
        res.json({ 
            success: true, 
            data: loans,
            penaltyInfo: {
                currentQuarter: quarterInfo.quarterLabel,
                overdueBooks: overdueCount,
                maxLoansAllowed: maxLoans,
                currentLoans: activeLoans[0].count,
                borrowingStatus: maxLoans > activeLoans[0].count ? 'Can Borrow' : 'Limit Reached',
                penaltyLevel: overdueCount === 0 ? 'None' : 
                             overdueCount === 1 ? 'Mild' :
                             overdueCount === 2 ? 'Moderate' : 'Severe',
                quarterlyPenaltyPoints: quarterlyPenaltyPoints,
                lastPenaltyQuarter: lastPenaltyQuarter
            }
        });
    } catch (err) {
        console.error("Error in getUserLoans:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Get penalty history for a user by quarter
const getUserPenaltyHistory = async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Get current quarter info
        const quarterInfo = getCurrentQuarterInfo();

        // Check if penalties table exists
        let penaltyHistory = [];
        let quarterlyBreakdown = {};
        
        try {
            // Get all penalties with quarter information
            const [penalties] = await pool.query(
                `SELECT p.id, p.loan_id, b.title, p.overdue_days, p.penalty_points, p.penalty_date, p.quarter,
                        CASE 
                            WHEN p.overdue_days >= 10 THEN 'Severe'
                            WHEN p.overdue_days >= 5 THEN 'Moderate'
                            ELSE 'Mild' 
                        END as penalty_level
                 FROM penalties p
                 JOIN loans l ON p.loan_id = l.id
                 JOIN books b ON l.book_id = b.id
                 WHERE p.user_id = ?
                 ORDER BY p.penalty_date DESC`,
                [userId]
            );
            penaltyHistory = penalties;
            
            // Calculate quarterly breakdown
            for (const penalty of penalties) {
                const quarter = penalty.quarter || 'Unknown';
                if (!quarterlyBreakdown[quarter]) {
                    quarterlyBreakdown[quarter] = {
                        totalPoints: 0,
                        penaltyCount: 0
                    };
                }
                quarterlyBreakdown[quarter].totalPoints += penalty.penalty_points;
                quarterlyBreakdown[quarter].penaltyCount += 1;
            }
        } catch (err) {
            console.log("Penalties table might not exist yet:", err);
            // Continue even if penalties table doesn't exist
        }
        
        // Get total quarterly penalty points
        let quarterlyPenaltyPoints = 0;
        let lastPenaltyQuarter = '';
        try {
            const [userPenalty] = await pool.query(
                'SELECT quarterly_penalty_points, last_penalty_quarter FROM users WHERE id = ?',
                [userId]
            );
            if (userPenalty.length > 0) {
                if (userPenalty[0].quarterly_penalty_points) {
                    quarterlyPenaltyPoints = userPenalty[0].quarterly_penalty_points;
                }
                if (userPenalty[0].last_penalty_quarter) {
                    lastPenaltyQuarter = userPenalty[0].last_penalty_quarter;
                }
            }
        } catch (err) {
            console.log("Could not fetch quarterly penalty points, columns might not exist:", err);
        }
        
        res.json({
            success: true,
            currentQuarter: quarterInfo.quarterLabel,
            data: penaltyHistory,
            quarterlyBreakdown: quarterlyBreakdown,
            currentQuarterPenaltyPoints: quarterlyPenaltyPoints,
            lastPenaltyQuarter: lastPenaltyQuarter
        });
    } catch (err) {
        console.error("Error in getUserPenaltyHistory:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Reset quarterly penalties (can be called by a cron job at the start of each quarter)
const resetQuarterlyPenalties = async (req, res) => {
    try {
        // Get current quarter info for logging
        const quarterInfo = getCurrentQuarterInfo();
        
        // Reset all users' quarterly penalty points
        await pool.query('UPDATE users SET quarterly_penalty_points = 0');
        
        res.json({
            success: true,
            message: `Quarterly penalties have been reset for ${quarterInfo.quarterLabel}`,
            quarter: quarterInfo.quarterLabel
        });
    } catch (err) {
        console.error("Error in resetQuarterlyPenalties:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { 
    borrowBook, 
    returnBook, 
    getUserLoans, 
    getUserPenaltyHistory,
    resetQuarterlyPenalties 
};