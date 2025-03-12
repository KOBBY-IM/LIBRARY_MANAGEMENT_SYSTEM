const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Add a new user
const addUser = async (req, res) => {
    const { username, email, department, password, role } = req.body;

    console.log("Request Body:", { username, email, department, password, role }); // Debugging: Log request body

    // Validate required fields
    if (!username || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Username, email, password, and role are required.' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed Password:", hashedPassword); // Debugging: Log hashed password

        // Insert the user into the database
        const [result] = await pool.query(
            'INSERT INTO users (username, email, department, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, department || null, hashedPassword, role]
        );

        console.log("Database Insert Result:", result); // Debugging: Log the result of the query

        if (result.affectedRows === 1) {
            res.status(201).json({ success: true, message: 'User added successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add user to the database.' });
        }
    } catch (err) {
        console.error("Error adding user:", err); // Debugging: Log the full error
        res.status(500).json({ success: false, message: err.message });
    }
};
// Get all users
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, role FROM users');

        // Disable caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json({ success: true, data: users });
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

// Get user profile
const getUserProfile = async (req, res) => {
    const userId = req.user.id; // Assuming the user ID is stored in the JWT token

    try {
        const [user] = await pool.query('SELECT id, username, email, role FROM users WHERE id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update user profile
const updateUserProfile = async (req, res) => {
    const userId = req.user.id; // Assuming the user ID is stored in the JWT token
    const { username, email, password } = req.body;

    try {
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await pool.query(
            'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?',
            [username, email, hashedPassword || null, userId]
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { addUser, getUsers, deleteUser, getUserProfile, 
    updateUserProfile };

