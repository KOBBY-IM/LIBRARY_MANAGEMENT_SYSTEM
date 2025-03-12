const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const register = async (req, res) => {
    const { username, email, password, department, role = 'user' } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database
        await pool.query(
            'INSERT INTO users (username, email, department, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, department, hashedPassword,  role]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'Username or email already exists' });
        } else {
            res.status(500).json({ message: err.message });
        }
    }
   
};

const login = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Fetch user from the database
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND role = ?',
            [username, role]
        );

        if (!users || users.length === 0) {
            return res.status(400).json({ message: 'User not found or role mismatch' });
        }

        const user = users[0];

        // Compare passwords
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ 
            token, 
            role: user.role, 
            user: { id: user.id } 
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'An error occurred during login' });
    }
};


module.exports = { register, login };
