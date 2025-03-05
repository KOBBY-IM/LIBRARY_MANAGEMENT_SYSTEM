const pool = require('../config/db');

const Book = {
    async create(title, author, isbn, genre, quantity) {
        const [result] = await pool.query(
            'INSERT INTO books (title, author, isbn, genre, quantity) VALUES (?, ?, ?, ?, ?)',
            [title, author, isbn, genre, quantity]
        );
        return result.insertId;
    },

    async findAll() {
        const [rows] = await pool.query('SELECT * FROM books');
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
        return rows[0];
    },

    async update(id, title, author, isbn, genre, quantity) {
        await pool.query(
            'UPDATE books SET title = ?, author = ?, isbn = ?, genre = ?, quantity = ? WHERE id = ?',
            [title, author, isbn, genre, quantity, id]
        );
    },

    async delete(id) {
        await pool.query('DELETE FROM books WHERE id = ?', [id]);
    }
};

module.exports = Book;