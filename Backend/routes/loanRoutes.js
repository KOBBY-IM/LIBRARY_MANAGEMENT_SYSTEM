const express = require('express');
const { borrowBook, returnBook, getUserLoans, getUserPenaltyHistory } = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/borrow', authMiddleware(['user']), borrowBook);
router.put('/return/:loanId', authMiddleware(['user']), returnBook);
router.get('/user/:userId', authMiddleware(['user']), getUserLoans);
router.get('/penalties/:userId', authMiddleware(['user']), getUserPenaltyHistory);

module.exports = router;