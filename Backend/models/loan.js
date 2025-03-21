const pool = require('../config/db');

const loan = {
    // Get all loans for a user
    async getUserLoans(userId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT l.id, b.title, b.author, l.due_date, l.returned FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ?',
                [userId]
            );
            return rows;
        } catch (err) {
            console.error('Error fetching user loans:', err);
            throw err;
        } finally {
            connection.release();
        }
    },

    // Borrow a book
    async borrowBook(userId, bookId, dueDate) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if the user has overdue loans
            const [overdueLoans] = await connection.query(
                'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND due_date < CURDATE() AND returned = FALSE',
                [userId]
            );
            
            const overdueCount = overdueLoans[0].count;
            
            // Apply progressive penalty based on number of overdue books
            let maxLoans = 10; // Increased default max to 10
            let penaltyPoints = 0;
            
            if (overdueCount > 0) {
                // Calculate penalty points (2 points per overdue book)
                penaltyPoints = overdueCount * 2;
                
                // Apply penalty to max loans allowed
                if (overdueCount >= 3) {
                    maxLoans = 3; // Severe penalty
                } else if (overdueCount === 2) {
                    maxLoans = 5; // Moderate penalty
                } else {
                    maxLoans = 7; // Mild penalty
                }
                
                // Record penalty points
                try {
                    await connection.query(
                        'UPDATE users SET penalty_points = penalty_points + ? WHERE id = ?',
                        [penaltyPoints, userId]
                    );
                } catch (err) {
                    console.log("Could not update penalty points, column might not exist:", err);
                }
            }

            // Check if the user has already borrowed the maximum number of books
            const [loans] = await connection.query(
                'SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE',
                [userId]
            );
            
            if (loans[0].count >= maxLoans) {
                throw new Error(`You have reached the maximum number of borrowed books (${maxLoans})`);
            }

            // Check if the book is available
            const [book] = await connection.query('SELECT quantity FROM books WHERE id = ?', [bookId]);
            if (book[0].quantity < 1) {
                throw new Error('Book not available');
            }

            // Reduce book quantity
            await connection.query('UPDATE books SET quantity = quantity - 1 WHERE id = ?', [bookId]);

            // Add loan record
            await connection.query('INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, ?)', [userId, bookId, dueDate]);

            await connection.commit();
            
            return {
                success: true,
                maxLoansAllowed: maxLoans,
                penaltyPoints: penaltyPoints
            };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    // Return a book
    async returnBook(loanId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get loan details
            const [loanDetails] = await connection.query(
                'SELECT l.*, b.id as book_id, b.title FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?',
                [loanId]
            );
            
            if (loanDetails.length === 0) {
                throw new Error('Loan record not found');
            }
            
            const loan = loanDetails[0];
            
            // Check if already returned
            if (loan.returned) {
                throw new Error('This book has already been returned');
            }
            
            // Check if overdue and apply penalty
            const dueDate = new Date(loan.due_date);
            const today = new Date();
            let penaltyPoints = 0;
            
            if (dueDate < today) {
                // Calculate days overdue
                const diffTime = Math.abs(today - dueDate);
                const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Apply penalty (1 point per day)
                penaltyPoints = overdueDays;
                
                // Record penalty
                try {
                    await connection.query(
                        'UPDATE users SET penalty_points = penalty_points + ? WHERE id = ?',
                        [penaltyPoints, loan.user_id]
                    );
                    
                    // Record in penalties table
                    await connection.query(
                        'INSERT INTO penalties (user_id, loan_id, overdue_days, penalty_points, penalty_date) VALUES (?, ?, ?, ?, NOW())',
                        [loan.user_id, loanId, overdueDays, penaltyPoints]
                    );
                } catch (err) {
                    console.log("Could not record penalty, table might not exist:", err);
                }
            }

            // Mark loan as returned
            await connection.query('UPDATE loans SET returned = TRUE, return_date = NOW() WHERE id = ?', [loanId]);

            // Increase book quantity
            await connection.query('UPDATE books SET quantity = quantity + 1 WHERE id = ?', [loan.book_id]);

            await connection.commit();
            
            return {
                success: true,
                bookTitle: loan.title,
                penaltyPoints: penaltyPoints
            };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    // Delete a loan
    async deleteLoan(loanId) {
        const connection = await pool.getConnection();
        try {
            await connection.query('DELETE FROM loans WHERE id = ?', [loanId]);
        } catch (err) {
            throw err;
        } finally {
            connection.release();
        }
    }
};

module.exports = loan;