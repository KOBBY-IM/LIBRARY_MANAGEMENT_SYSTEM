const express = require('express');
const router = express.Router();
const { getUserNotifications, markNotificationAsRead, createNotification } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Get notifications for a user
router.get('/user/:userId', authMiddleware(['user']), getUserNotifications);

// Mark a notification as read
router.put('/:notificationId/read', authMiddleware(['user']), markNotificationAsRead);

// Create a notification (used by the system)
router.post('/', authMiddleware(['user']), createNotification);

module.exports = router;