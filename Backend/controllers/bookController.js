const pool = require('../config/db');

// Add a new book
const addBook = async (req, res) => {
    const { title, author, isbn, genre, quantity, coverImageUrl } = req.body;

    try {
        await pool.query(
            'INSERT INTO books (title, author, isbn, genre, quantity, cover_image_url) VALUES (?, ?, ?, ?, ?, ?)', 
            [title, author, isbn, genre, quantity, coverImageUrl]
        );
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
    const { title, author, isbn, genre, quantity, coverImageUrl } = req.body;
    
    try {
        await pool.query(
            'UPDATE books SET title = ?, author = ?, isbn = ?, genre = ?, quantity = ?, cover_image_url = ? WHERE id = ?', 
            [title, author, isbn, genre, quantity, coverImageUrl, id]
        );
        
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
    const { searchTerm } = req.query;

    if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: 'Search term is required' 
        });
    }

    try {
        // Improved search query that also includes genre
        const [books] = await pool.query(
            'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?', 
            [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        );
        
        // Sort results by relevance (exact matches first, then partial matches)
        books.sort((a, b) => {
            // Check for exact title matches first
            if (a.title.toLowerCase() === searchTerm.toLowerCase()) return -1;
            if (b.title.toLowerCase() === searchTerm.toLowerCase()) return 1;
            
            // Then check for titles that start with the search term
            if (a.title.toLowerCase().startsWith(searchTerm.toLowerCase())) return -1;
            if (b.title.toLowerCase().startsWith(searchTerm.toLowerCase())) return 1;
            
            // Then sort by title for consistent results
            return a.title.localeCompare(b.title);
        });
        
        res.json({ success: true, data: books });
    } catch (err) {
        console.error('Search error:', err);
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