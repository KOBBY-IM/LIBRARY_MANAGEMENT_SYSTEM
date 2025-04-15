const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');


// Load environment variables before requiring `pool`
dotenv.config({ path: path.resolve(__dirname, '.env') });

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');
const loanRoutes = require('./routes/loanRoutes');
const messageRoutes = require('./routes/messageRoute');


const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;  // Default port 5000 if undefined

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// Log request to the server
app.use((req, res, next) => {
    console.log(req.method, req.url);
    console.log('Request body:', req.body);
    next();
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/messages', messageRoutes);

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/Index.html'));
});

// Test database connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');
        connection.release();
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
})();


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});