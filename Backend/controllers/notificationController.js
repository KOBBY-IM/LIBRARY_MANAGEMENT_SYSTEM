const pool = require('../config/db');

// Get notifications for a user
const getUserNotifications = async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'User ID is required' 
        });
    }

    try {
        // Get all notification types:
        // 1. Books due soon (within 2 days)
        // 2. Overdue books
        // 3. Notifications from the database
   
        
        // First, get books due soon
        const [dueSoonLoans] = await pool.query(
            `SELECT l.id, b.title, DATEDIFF(l.due_date, CURDATE()) as days_remaining
             FROM loans l 
             JOIN books b ON l.book_id = b.id 
             WHERE l.user_id = ? AND l.returned = FALSE 
             AND DATEDIFF(l.due_date, CURDATE()) BETWEEN 0 AND 2
             ORDER BY l.due_date ASC`, 
            [userId]
        );
        
        // Second, get overdue books
        const [overdueLoans] = await pool.query(
            `SELECT l.id, b.title, ABS(DATEDIFF(l.due_date, CURDATE())) as days_overdue
             FROM loans l 
             JOIN books b ON l.book_id = b.id 
             WHERE l.user_id = ? AND l.returned = FALSE 
             AND l.due_date < CURDATE()
             ORDER BY l.due_date ASC`, 
            [userId]
        );
        
        // Get user's notifications from the notifications table
        const [dbNotifications] = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC
             LIMIT 20`, 
            [userId]
        );
        
        // Combine all notifications
        let notifications = [];
        
        // Add due soon notifications
        dueSoonLoans.forEach(loan => {
            notifications.push({
                id: `due_soon_${loan.id}`,
                type: 'due_soon',
                title: `"${loan.title}" is due ${loan.days_remaining === 0 ? 'today' : 'in ' + loan.days_remaining + ' day(s)'}`,
                message: `Please return or renew the book to avoid overdue penalties.`,
                loanId: loan.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        });
        
        // Add overdue notifications
        overdueLoans.forEach(loan => {
            notifications.push({
                id: `overdue_${loan.id}`,
                type: 'overdue',
                title: `"${loan.title}" is overdue`,
                message: `This book is ${loan.days_overdue} day(s) overdue. Please return it as soon as possible.`,
                loanId: loan.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        });
        
        // Add database notifications
        dbNotifications.forEach(notification => {
            notifications.push({
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                loanId: notification.loan_id,
                read: notification.read === 1,
                createdAt: notification.created_at
            });
        });
        
        res.json({ 
            success: true, 
            notifications: notifications
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    
    try {
        // Check if it's a system-generated notification or from the database
        if (notificationId.startsWith('due_soon_') || notificationId.startsWith('overdue_')) {
            // For system notifications, we don't need to update the database
            return res.json({
                success: true,
                message: 'Notification marked as read'
            });
        }
        
        // Update the notification in the database
        await pool.query(
            'UPDATE notifications SET `read` = TRUE WHERE id = ?',
            [notificationId]
        );
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (err) {
        console.error("Error marking notification as read:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Create a notification (used by the system)
const createNotification = async (req, res) => {
    const { userId, type, title, message, loanId } = req.body;
    
    if (!userId || !type || !title || !message) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }
    
    try {
        const [result] = await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, loan_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, type, title, message, loanId || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Notification created',
            notificationId: result.insertId
        });
    } catch (err) {
        console.error("Error creating notification:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { getUserNotifications, markNotificationAsRead, createNotification };