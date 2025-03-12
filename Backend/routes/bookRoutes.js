const express = require('express');
const { addBook, getBooks, updateBook, deleteBook, searchBooks, getBookById } = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/search', searchBooks);
router.post('/', authMiddleware(['admin']), addBook);
router.get('/', getBooks);
router.put('/:id', authMiddleware(['admin']), updateBook);
router.delete('/:id', authMiddleware(['admin']), deleteBook);
router.get('/:id', authMiddleware(['admin']), getBookById);


module.exports = router;