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
        //console.log('Fetched books:', books); // debugging line

        // Disable caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json({ success: true, data: books });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch books from the database.' });
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

// Search for books by title or author
const searchBooks = async (req, res) => {
    const { searchTerm } = req.params;

    try {
        const [books] = await pool.query('SELECT * FROM books WHERE title LIKE ? OR author LIKE ?', [`%${searchTerm}%`, `%${searchTerm}%`]);
        res.json({ success: true, data: books });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get a single book by ID
const getBookById = async (req, res) => {
    const { id } = req.params;

    try {
        const [book] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
        if (book.length === 0) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



module.exports = { addBook, getBooks, updateBook, deleteBook, searchBooks, getBookById};