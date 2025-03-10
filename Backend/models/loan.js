
const pool = require('../config/db');


const loan = { 
    async getUserLoans(req, res) {
        const userId = req.params.userId;
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query('SELECT * FROM loans WHERE user_id = ?', [userId]);
            res.json(rows);
        } catch (err) {
            console.error('Error fetching user loans:', err);
            res.status(500).json({ error: 'Failed to fetch user loans' });
        } finally {
            connection.release();
        }
    }
};

module.exports = loan;

