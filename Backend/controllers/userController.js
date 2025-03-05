const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Add a new user
const addUser = async (req, res) => {
    const { name, email, role, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, email, role, password) VALUES (?, ?, ?, ?)', [name, email, role, hashedPassword]);
        res.status(201).json({ success: true, message: 'User added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, role FROM users');
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a user
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, role } = req.body;

    try {
        await pool.query('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?', [username, email, role, id]);
        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a user
const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { addUser, getUsers, updateUser, deleteUser };