const express = require('express');
const { addUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware(['admin']), addUser);
router.get('/', authMiddleware(['admin']), getUsers);
router.put('/:id', authMiddleware(['admin']), updateUser);
router.delete('/:id', authMiddleware(['admin']), deleteUser);

module.exports = router;