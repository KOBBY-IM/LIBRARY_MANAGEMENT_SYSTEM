const express = require('express');
const router = express.Router();
const { getUserMessages, deleteMessage, markMessageAsRead, createMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Error handler middleware
const apiErrorHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      console.error(`API Error in ${handler.name}:`, err);
      
      // Ensure we always send JSON even in case of errors
      res.status(500).json({
        success: false,
        message: err.message || 'An unexpected error occurred'
      });
    }
  };
};

// Get messages for a user
router.get('/user/:userId', authMiddleware(['user']), apiErrorHandler(getUserMessages));

// Delete a message
router.delete('/:messageId', authMiddleware(['user']), apiErrorHandler(deleteMessage));

// Mark a message as read
router.put('/:messageId/read', authMiddleware(['user']), apiErrorHandler(markMessageAsRead));

// Create a message (used by the system)
router.post('/', authMiddleware(['admin', 'user']), apiErrorHandler(createMessage));

module.exports = router;