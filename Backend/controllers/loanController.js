const pool = require('../config/db');

// Borrow a book
const borrowBook = async (req, res) => {
    const { userId, bookId } = req.body;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if the user has already borrowed 5 books
        const [loans] = await connection.query('SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE', [userId]);
        if (loans[0].count >= 5) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'You have reached the maximum number of borrowed books' });
        }

        // Check if the book is available
        const [book] = await connection.query('SELECT quantity FROM books WHERE id = ?', [bookId]);
        if (book[0].quantity < 1) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Book not available' });
        }

        // Reduce book quantity
        await connection.query('UPDATE books SET quantity = quantity - 1 WHERE id = ?', [bookId]);

        // Add loan record
        await connection.query('INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, ?)', [userId, bookId, dueDate]);

        await connection.commit();
        res.status(201).json({ success: true, message: 'Book borrowed successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Return a book
const returnBook = async (req, res) => {
    const { loanId } = req.params;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Mark loan as returned
        await connection.query('UPDATE loans SET returned = TRUE WHERE id = ?', [loanId]);

        // Increase book quantity
        const [loan] = await connection.query('SELECT book_id FROM loans WHERE id = ?', [loanId]);
        await connection.query('UPDATE books SET quantity = quantity + 1 WHERE id = ?', [loan[0].book_id]);

        await connection.commit();
        res.json({ success: true, message: 'Book returned successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Get all loans for a user
const getUserLoans = async (req, res) => {
    const { userId } = req.params;

    try {
        const [loans] = await pool.query('SELECT l.id, b.title, b.author, l.due_date FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ? AND l.returned = FALSE', [userId]);
        res.json({ success: true, data: loans });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { borrowBook, returnBook, getUserLoans };