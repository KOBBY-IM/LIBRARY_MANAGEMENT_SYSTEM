const pool = require('../config/db');

// Add a new book
const addBook = async (req, res) => {
    const { title, author, isbn, genre, quantity } = req.body;

    try {
        await pool.query('INSERT INTO books (title, author, isbn, genre, quantity) VALUES (?, ?, ?, ?, ?)', [title, author, isbn, genre, quantity]);
        res.status(201).json({ success: true, message: 'Book added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all books
const getBooks = async (req, res) => {
    try {
        const [books] = await pool.query('SELECT * FROM books');
        res.json({ success: true, data: books });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a book
const updateBook = async (req, res) => {
    const { id } = req.params;
    const { title, author, isbn, genre, quantity } = req.body;

    try {
        await pool.query('UPDATE books SET title = ?, author = ?, isbn = ?, genre = ?, quantity = ? WHERE id = ?', [title, author, isbn, genre, quantity, id]);
        res.json({ success: true, message: 'Book updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a book
const deleteBook = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM books WHERE id = ?', [id]);
        res.json({ success: true, message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { addBook, getBooks, updateBook, deleteBook };