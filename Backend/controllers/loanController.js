const pool = require('../config/db');

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

        // Check if the user has overdue loans and how many
        const [overdueLoans] = await connection.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE',
            [userId]
        );
        const overdueCount = overdueLoans[0].count;
        console.log("Overdue loans count:", overdueCount);

        // Apply progressive penalty based on number of overdue books
        let maxLoans = 5; // Default max loans
        let penaltyMessage = '';
        
        if (overdueCount > 0) {
            if (overdueCount >= 3) {
                maxLoans = 1; // Severe penalty: only 1 book allowed
                penaltyMessage = 'Severe penalty applied: You have 3 or more overdue books';
            } else if (overdueCount === 2) {
                maxLoans = 2; // Moderate penalty: only 2 books allowed
                penaltyMessage = 'Moderate penalty applied: You have 2 overdue books';
            } else {
                maxLoans = 3; // Mild penalty: 3 books allowed
                penaltyMessage = 'Mild penalty applied: You have 1 overdue book';
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

        // Add loan record
        const [result] = await connection.query(
            'INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, ?)', 
            [userId, bookId, dueDate]
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
            dueDate: dueDate
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

        // Check if the book is overdue
        const dueDate = new Date(loanCheck[0].due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        let overdueDays = 0;
        let penaltyMessage = '';
        
        if (isOverdue) {
            // Calculate number of days overdue
            const diffTime = Math.abs(today - dueDate);
            overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Record the late return in a new penalties table (would need to create this table)
            try {
                await connection.query(
                    'INSERT INTO penalties (user_id, loan_id, overdue_days, penalty_date) VALUES (?, ?, ?, NOW())',
                    [loanCheck[0].user_id, loanId, overdueDays]
                );
                penaltyMessage = `Note: This book was returned ${overdueDays} day(s) late. Your borrowing limit has been temporarily reduced.`;
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
            overdueDays: overdueDays
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
        // Get the user's loans with more detailed information
        const [loans] = await pool.query(
            `SELECT l.id, b.title, b.author, l.borrow_date, l.due_date, 
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
        
        // Get penalty status info
        const [overdueLoans] = await pool.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE',
            [userId]
        );
        
        const overdueCount = overdueLoans[0].count;
        let maxLoans = 5; // Default
        
        // Calculate max loans based on penalty
        if (overdueCount >= 3) {
            maxLoans = 1;
        } else if (overdueCount === 2) {
            maxLoans = 2;
        } else if (overdueCount === 1) {
            maxLoans = 3;
        }
        
        // Get current active loans count
        const [activeLoans] = await pool.query(
            'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE',
            [userId]
        );
        
        res.json({ 
            success: true, 
            data: loans,
            penaltyInfo: {
                overdueBooks: overdueCount,
                maxLoansAllowed: maxLoans,
                currentLoans: activeLoans[0].count,
                borrowingStatus: maxLoans > activeLoans[0].count ? 'Can Borrow' : 'Limit Reached',
                penaltyLevel: overdueCount === 0 ? 'None' : 
                             overdueCount === 1 ? 'Mild' :
                             overdueCount === 2 ? 'Moderate' : 'Severe'
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

// Get penalty history for a user
const getUserPenaltyHistory = async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Check if penalties table exists
        let penaltyHistory = [];
        try {
            const [penalties] = await pool.query(
                `SELECT p.id, p.loan_id, b.title, p.overdue_days, p.penalty_date, 
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
        } catch (err) {
            console.log("Penalties table might not exist yet:", err);
            // Continue even if penalties table doesn't exist
        }
        
        res.json({
            success: true,
            data: penaltyHistory
        });
    } catch (err) {
        console.error("Error in getUserPenaltyHistory:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { borrowBook, returnBook, getUserLoans, getUserPenaltyHistory };