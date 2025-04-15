const express = require('express');
const { 
    borrowBook, 
    returnBook, 
    getUserLoans, 
    getUserPenaltyHistory,
    getAllLoans
} = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/borrow', authMiddleware(['user']), borrowBook);
router.put('/return/:loanId', authMiddleware(['user']), returnBook);
router.get('/user/:userId', authMiddleware(['user']), getUserLoans);
router.get('/penalties/:userId', authMiddleware(['user']), getUserPenaltyHistory);
router.get('/all', authMiddleware(['admin']), getAllLoans);

module.exports = router;