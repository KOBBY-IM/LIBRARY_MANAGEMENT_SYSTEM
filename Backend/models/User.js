const pool = require('../config/db');

const User = {
    async create(username, email, password, role, fullName, address, phoneNumber) {
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role, full_name, address, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, password, role, fullName, address, phoneNumber]
        );
        return result.insertId;
    },

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }
};

module.exports = User;