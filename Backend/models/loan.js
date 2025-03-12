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

            // Apply penalty if overdue loans exist
            const maxLoans = overdueLoans[0].count > 0 ? 3 : 5; // Penalty: Reduce limit to 3 if overdue

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

            // Mark loan as returned
            await connection.query('UPDATE loans SET returned = TRUE WHERE id = ?', [loanId]);

            // Increase book quantity
            const [loan] = await connection.query('SELECT book_id FROM loans WHERE id = ?', [loanId]);
            await connection.query('UPDATE books SET quantity = quantity + 1 WHERE id = ?', [loan[0].book_id]);

            await connection.commit();
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