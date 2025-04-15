const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper function to validate email format
const isValidEmail = (email) => {
    // Comprehensive email validation that handles:
    // - Standard emails (user@example.com)
    // - Subdomains (user@sub.example.com)
    // - Country-specific domains (user@example.ac.uk)
    // - Educational domains (student@university.edu)
    // - Plus addressing (user+tag@example.com)
    // - Alphanumeric and some special characters in local part
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

// Add a new user
const addUser = async (req, res) => {
    const { username, email, department, password, role } = req.body;

    console.log("Request Body:", { username, email, department, password, role }); // Debugging: Log request body

    // Validate required fields
    if (!username || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Username, email, password, and role are required.' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed Password:", hashedPassword); // Debugging: Log hashed password

        // Insert the user into the database with quarterly penalty tracking
        const [result] = await pool.query(
            'INSERT INTO users (username, email, department, password, role, quarterly_penalty_points, last_penalty_quarter) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, department || null, hashedPassword, role, 0, null]
        );

        console.log("Database Insert Result:", result); // Debugging: Log the result of the query

        if (result.affectedRows === 1) {
            res.status(201).json({ success: true, message: 'User added successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add user to the database.' });
        }
    } catch (err) {
        console.error("Error adding user:", err); // Debugging: Log the full error
        
        // Check for duplicate entry error
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Username or email already exists.' });
        }
        
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, role, quarterly_penalty_points, last_penalty_quarter FROM users');

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
        const [user] = await pool.query(
            'SELECT id, username, email, role, full_name, address, phone_number, quarterly_penalty_points, last_penalty_quarter FROM users WHERE id = ?', 
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get current quarter info
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        
        let quarter;
        if (month < 3) quarter = 1;
        else if (month < 6) quarter = 2;
        else if (month < 9) quarter = 3;
        else quarter = 4;
        
        const currentQuarter = `Q${quarter} ${year}`;

        // Add current quarter information to response
        const userData = {
            ...user[0],
            currentQuarter: currentQuarter,
            isCurrentQuarterPenalty: user[0].last_penalty_quarter === currentQuarter
        };

        res.json({ success: true, data: userData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update user profile
const updateUserProfile = async (req, res) => {
    const userId = req.user.id; // Assuming the user ID is stored in the JWT token
    const { email, password, fullName, address, phoneNumber } = req.body;

    console.log("Update profile request:", { userId, ...req.body });

    try {
        // First, verify the user exists
        const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Build the query dynamically based on provided fields
        let updateFields = [];
        let params = [];

        // Add email if provided
        if (email) {
            // Validate email format
            if (!isValidEmail(email)) {
                return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
            }
            updateFields.push('email = ?');
            params.push(email);
        }

        // Handle password update if provided
        if (password) {
            // Add password length validation
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        // Add new personal information fields
        if (fullName !== undefined) {
            updateFields.push('full_name = ?');
            params.push(fullName);
        }

        if (address !== undefined) {
            updateFields.push('address = ?');
            params.push(address);
        }

        if (phoneNumber !== undefined) {
            updateFields.push('phone_number = ?');
            params.push(phoneNumber);
        }

        // If no fields to update, return early
        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No fields provided for update' 
            });
        }

        // Construct the SQL query
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        params.push(userId);

        console.log("Update query:", query);
        console.log("Update params:", params);

        // Execute the update
        const [result] = await pool.query(query, params);

        if (result.affectedRows === 1) {
            // Fetch the updated user data to return
            const [updatedUser] = await pool.query(
                'SELECT id, username, email, role, full_name, address, phone_number FROM users WHERE id = ?', 
                [userId]
            );
            
            console.log("Updated user data:", updatedUser[0]);
            
            res.json({ 
                success: true, 
                message: 'Profile updated successfully',
                updatedFields: Object.keys(req.body).filter(key => key !== 'password'),
                data: updatedUser[0] // Return the updated user data
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update profile' 
            });
        }
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'An error occurred while updating profile' 
        });
    }
};

// Reset a user's quarterly penalties (for admin use)
const resetUserQuarterlyPenalties = async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Reset the user's quarterly penalties
        await pool.query(
            'UPDATE users SET quarterly_penalty_points = 0 WHERE id = ?',
            [userId]
        );
        
        // Get current quarter info
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        
        let quarter;
        if (month < 3) quarter = 1;
        else if (month < 6) quarter = 2;
        else if (month < 9) quarter = 3;
        else quarter = 4;
        
        const currentQuarter = `Q${quarter} ${year}`;
        
        res.json({ 
            success: true, 
            message: `Quarterly penalties reset for user ID ${userId}`,
            quarter: currentQuarter
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get quarterly penalty summary for all users
const getQuarterlyPenaltySummary = async (req, res) => {
    try {
        // Get current quarter info
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        
        let quarter;
        if (month < 3) quarter = 1;
        else if (month < 6) quarter = 2;
        else if (month < 9) quarter = 3;
        else quarter = 4;
        
        const currentQuarter = `Q${quarter} ${year}`;
        
        // Get penalties by quarter
        const [quarterlyPenalties] = await pool.query(`
            SELECT 
                quarter, 
                COUNT(DISTINCT user_id) AS users_with_penalties,
                SUM(penalty_points) AS total_penalty_points,
                AVG(penalty_points) AS avg_penalty_points_per_incident,
                MAX(penalty_points) AS max_penalty_points
            FROM 
                penalties
            GROUP BY 
                quarter
            ORDER BY 
                quarter DESC
        `);
        
        // Get top 10 users with highest quarterly penalties
        const [topUsers] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.quarterly_penalty_points,
                u.last_penalty_quarter
            FROM 
                users u
            WHERE 
                u.quarterly_penalty_points > 0
            ORDER BY 
                u.quarterly_penalty_points DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            currentQuarter,
            quarterlyPenalties,
            topUsers
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { 
    addUser, 
    getUsers, 
    deleteUser, 
    getUserProfile, 
    updateUserProfile,
    resetUserQuarterlyPenalties,
    getQuarterlyPenaltySummary
};