const express = require('express');
const { addUser, getUsers, updateUser, 
    getUserProfile, updateUserProfile, deleteUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();


router.post('/', authMiddleware(['admin']), addUser);
router.get('/', authMiddleware(['admin']), getUsers);
router.delete('/:id', authMiddleware(['admin']), deleteUser);
router.get('/profile', authMiddleware(['user', 'admin']), getUserProfile);
router.put('/profile', authMiddleware(['user', 'admin']), updateUserProfile);

module.exports = router;