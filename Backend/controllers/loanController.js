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

// Helper function to create a message
const createMessage = async (connection, userId, type, title, content, loanId) => {
    try {
        await connection.query(
            'INSERT INTO messages (user_id, type, title, content, loan_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, type, title, content, loanId]
        );
    } catch (err) {
        console.error("Error creating message:", err);
        // Continue even if message creation fails
    }
};

// Borrow a book
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
            
            // Apply penalty based only on accumulated quarterly points with updated thresholds
            if (penaltyPoints >= 20) {
                maxLoans = 0; // Borrowing blocked: Cannot borrow any books
                penaltyMessage = `Borrowing privileges suspended: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}). Please speak with a librarian.`;
            } else if (penaltyPoints >= 13) {
                maxLoans = 4; // Severe penalty: reduce by 6 books (10-6=4)
                penaltyMessage = `Severe penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            } else if (penaltyPoints >= 9) {
                maxLoans = 6; // Moderate penalty: reduce by 4 books (10-4=6)
                penaltyMessage = `Moderate penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            } else if (penaltyPoints >= 5) {
                maxLoans = 8; // Mild penalty: reduce by 2 books (10-2=8)
                penaltyMessage = `Mild penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
            }
            // No penalty for 0-4 points (maxLoans remains 10)
        } else {
            // Handle case where quarterly_penalty_points is not available
            // Check overdue books and update quarterly points
            const [overdueLoans] = await connection.query(
                'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE AND borrow_date >= ? AND borrow_date <= ?',
                [userId, quarterInfo.quarterStart, quarterInfo.quarterEnd]
            );
            const overdueCount = overdueLoans[0].count;
            console.log("Overdue loans count in current quarter:", overdueCount);
            
            if (overdueCount > 0) {
                // Apply penalty points based on overdue count
                penaltyPoints = overdueCount * 2; // 2 points per overdue book
                
                // Apply the same penalty point logic as above
                if (penaltyPoints >= 20) {
                    maxLoans = 0;
                    penaltyMessage = `Borrowing privileges suspended: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}). Please speak with a librarian.`;
                } else if (penaltyPoints >= 13) {
                    maxLoans = 4;
                    penaltyMessage = `Severe penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
                } else if (penaltyPoints >= 9) {
                    maxLoans = 6;
                    penaltyMessage = `Moderate penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
                } else if (penaltyPoints >= 5) {
                    maxLoans = 8;
                    penaltyMessage = `Mild penalty applied: You have ${penaltyPoints} penalty points this quarter (${quarterInfo.quarterLabel}).`;
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

        // FIXED ORDER: First check if borrowing is suspended (maxLoans = 0)
        if (maxLoans === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: penaltyMessage
            });
        }

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

        // NEW CHECK: Check if the user already has an active loan for this book
        const [existingLoan] = await connection.query(
            'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND returned = FALSE',
            [userId, bookId]
        );
        
        if (existingLoan.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'You already have an active loan for this book. You cannot borrow multiple copies of the same book.'
            });
        }

        // Check if the book is available
        const [book] = await connection.query('SELECT title, quantity FROM books WHERE id = ?', [bookId]);
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

        // Create borrow success message
        await createMessage(
            connection,
            userId,
            'borrow_success',
            `Successfully borrowed "${book[0].title}"`,
            `You have borrowed "${book[0].title}". The due date is ${dueDate.toLocaleDateString()}. Please return it before the due date to avoid penalties.`,
            result.insertId
        );

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

        // Create return success message
        await createMessage(
            connection,
            loanCheck[0].user_id,
            'return_success',
            `Successfully returned "${loanCheck[0].title}"`,
            `You have returned "${loanCheck[0].title}" successfully.${isOverdue ? ` Book was ${overdueDays} day(s) overdue.` : ''}`,
            loanId
        );

        // If there was a penalty, add a separate penalty message
        if (isOverdue && penaltyPoints > 0) {
            await createMessage(
                connection,
                loanCheck[0].user_id,
                'penalty',
                `Penalty points added: ${penaltyPoints}`,
                `You received ${penaltyPoints} penalty points for returning "${loanCheck[0].title}" ${overdueDays} day(s) late. These points affect your borrowing limit this quarter (${quarterInfo.quarterLabel}).`,
                loanId
            );
        }

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
        
        // Get user's quarterly penalty points
        let quarterlyPenaltyPoints = 0;
        let lastPenaltyQuarter = '';
        let maxLoans = 10; // Default maximum loans
        
        try {
            const [userPenalty] = await pool.query(
                'SELECT quarterly_penalty_points, last_penalty_quarter FROM users WHERE id = ?',
                [userId]
            );
            
            if (userPenalty.length > 0) {
                if (userPenalty[0].quarterly_penalty_points) {
                    quarterlyPenaltyPoints = userPenalty[0].quarterly_penalty_points;
                    
                    // Apply the updated penalty point tiers
                    if (quarterlyPenaltyPoints >= 20) {
                        maxLoans = 0; // Borrowing blocked
                    } else if (quarterlyPenaltyPoints >= 13) {
                        maxLoans = 4;
                    } else if (quarterlyPenaltyPoints >= 9) {
                        maxLoans = 6;
                    } else if (quarterlyPenaltyPoints >= 5) {
                        maxLoans = 8;
                    }
                }
                
                if (userPenalty[0].last_penalty_quarter) {
                    lastPenaltyQuarter = userPenalty[0].last_penalty_quarter;
                }
            }
        } catch (err) {
            console.log("Could not fetch quarterly penalty points, columns might not exist:", err);
        }
        
        // Get current active loans count
        const [activeLoans] = await pool.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE',
            [userId]
        );
        
        // Determine penalty level based on points
        let penaltyLevel = 'None';
        if (quarterlyPenaltyPoints >= 20) {
            penaltyLevel = 'Borrowing Suspended';
        } else if (quarterlyPenaltyPoints >= 13) {
            penaltyLevel = 'Severe';
        } else if (quarterlyPenaltyPoints >= 9) {
            penaltyLevel = 'Moderate';
        } else if (quarterlyPenaltyPoints >= 5) {
            penaltyLevel = 'Mild';
        }
        
        res.json({ 
            success: true, 
            data: loans,
            penaltyInfo: {
                currentQuarter: quarterInfo.quarterLabel,
                maxLoansAllowed: maxLoans,
                currentLoans: activeLoans[0].count,
                borrowingStatus: maxLoans > activeLoans[0].count && maxLoans > 0 ? 'Can Borrow' : 'Limit Reached',
                penaltyLevel: penaltyLevel,
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

// Get all loans with user and book details (for admin)
const getAllLoans = async (req, res) => {
    try {
        // Get query parameters for optional filtering
        const { status, search } = req.query;
        
        // Base query with JOINs to get user and book information
        let query = `
            SELECT l.id, l.borrow_date, l.due_date, l.return_date, l.returned, l.quarter,
                   b.id as book_id, b.title as book_title, b.author as book_author, b.isbn,
                   u.id as user_id, u.username, u.email, u.department,
                   DATEDIFF(l.due_date, CURDATE()) as days_remaining,
                   CASE 
                       WHEN l.due_date < CURDATE() AND l.returned = FALSE THEN TRUE 
                       ELSE FALSE 
                   END as is_overdue
            FROM loans l
            JOIN books b ON l.book_id = b.id
            JOIN users u ON l.user_id = u.id
        `;

        // Add WHERE conditions based on filters
        let whereConditions = [];
        let params = [];

        if (status === 'active') {
            whereConditions.push('l.returned = FALSE');
        } else if (status === 'returned') {
            whereConditions.push('l.returned = TRUE');
        } else if (status === 'overdue') {
            whereConditions.push('l.returned = FALSE AND l.due_date < CURDATE()');
        }

        if (search) {
            whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        // Add WHERE clause if needed
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add ordering to show most recent loans first and overdue ones at the top
        query += ' ORDER BY l.returned ASC, is_overdue DESC, l.borrow_date DESC';
        
        // Execute query
        const [loans] = await pool.query(query, params);
        
        // Get some statistics
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_loans,
                SUM(CASE WHEN returned = FALSE THEN 1 ELSE 0 END) as active_loans,
                SUM(CASE WHEN returned = FALSE AND due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_loans
            FROM loans
        `);
        
        // Return the loans with statistics
        res.json({ 
            success: true, 
            data: loans,
            stats: stats[0],
            filters: {
                status: status || 'all',
                search: search || ''
            }
        });
    } catch (err) {
        console.error("Error in getAllLoans:", err);
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
    resetQuarterlyPenalties,
    getAllLoans 
};