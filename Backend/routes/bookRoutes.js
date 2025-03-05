const express = require('express');
const { addBook, getBooks, updateBook, deleteBook } = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware(['admin']), addBook);
router.get('/', getBooks);
router.put('/:id', authMiddleware(['admin']), updateBook);
router.delete('/:id', authMiddleware(['admin']), deleteBook);

module.exports = router;