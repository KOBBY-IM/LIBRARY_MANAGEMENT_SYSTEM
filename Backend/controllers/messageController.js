const pool = require('../config/db');

// Get messages for a user
const getUserMessages = async (req, res) => {
    const { userId } = req.params;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'User ID is required' 
        });
    }

    try {
        // Get all message types:
        // 1. Books due soon (within 2 days)
        // 2. Overdue books
        // 3. Messages from the database
   
        
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
        
        // Get user's messages from the messages table
        const [dbMessages] = await pool.query(
            `SELECT * FROM messages 
             WHERE user_id = ? AND deleted = FALSE
             ORDER BY created_at DESC
             LIMIT 50`, 
            [userId]
        );
        
        // Get list of auto-messages that are already marked as read by checking deleted_system_messages
        const [readSystemMessages] = await pool.query(
            `SELECT loan_id, message_type FROM deleted_system_messages 
             WHERE user_id = ?`,
            [userId]
        );
        
        // Create a map for quick lookup
        const readSystemMessageMap = {};
        readSystemMessages.forEach(item => {
            const key = `${item.message_type}_${item.loan_id}`;
            readSystemMessageMap[key] = true;
        });
        
        // Combine all messages
        let messages = [];
        
        // Add due soon messages
        dueSoonLoans.forEach(loan => {
            const messageId = `due_soon_${loan.id}`;
            const isRead = readSystemMessageMap[`due_soon_${loan.id}`] || false;
            
            messages.push({
                id: messageId,
                type: 'due_soon',
                title: `"${loan.title}" is due ${loan.days_remaining === 0 ? 'today' : 'in ' + loan.days_remaining + ' day(s)'}`,
                message: `Please return or renew the book to avoid overdue penalties.`,
                loanId: loan.id,
                createdAt: new Date().toISOString(),
                system: true,
                read: isRead
            });
        });
        
        // Add overdue messages
        overdueLoans.forEach(loan => {
            const messageId = `overdue_${loan.id}`;
            const isRead = readSystemMessageMap[`overdue_${loan.id}`] || false;
            
            messages.push({
                id: messageId,
                type: 'overdue',
                title: `"${loan.title}" is overdue`,
                message: `This book is ${loan.days_overdue} day(s) overdue. Please return it as soon as possible.`,
                loanId: loan.id,
                createdAt: new Date().toISOString(),
                system: true,
                read: isRead
            });
        });
        
        // Add database messages
        dbMessages.forEach(message => {
            messages.push({
                id: message.id,
                type: message.type,
                title: message.title,
                message: message.content,
                loanId: message.loan_id,
                createdAt: message.created_at,
                system: false,
                read: message.read === 1
            });
        });
        
        // Count unread messages
        const unreadCount = messages.filter(msg => !msg.read).length;
        
        res.json({ 
            success: true, 
            messages: messages,
            unreadCount: unreadCount
        });
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Delete a message
const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    
    try {
        // Check if it's a system-generated message or from the database
        if (messageId.startsWith('due_soon_') || messageId.startsWith('overdue_')) {
            // For system messages, we create a record in deleted_system_messages to keep track
            const parts = messageId.split('_');
            const messageType = parts[0] + '_' + parts[1]; // 'due_soon' or 'overdue'
            const loanId = parts[2];
            
            await pool.query(
                'INSERT INTO deleted_system_messages (user_id, loan_id, message_type) VALUES (?, ?, ?)',
                [req.user.id, loanId, messageType]
            );
            
            return res.json({
                success: true,
                message: 'Message deleted'
            });
        }
        
        // Update the message in the database (soft delete)
        await pool.query(
            'UPDATE messages SET deleted = TRUE WHERE id = ? AND user_id = ?',
            [messageId, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Message deleted'
        });
    } catch (err) {
        console.error("Error deleting message:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

const markMessageAsRead = async (req, res) => {
    const { messageId } = req.params;
    
    if (!messageId) {
        return res.status(400).json({
            success: false,
            message: 'Message ID is required'
        });
    }
    
    try {
        // Add logging to help with debugging
        console.log(`Marking message as read: ${messageId}, User: ${req.user.id}`);
        
        // Check if it's a system-generated message or from the database
        if (messageId.startsWith('due_soon_') || messageId.startsWith('overdue_')) {
            // For system messages, we create a record in deleted_system_messages with read flag
            const parts = messageId.split('_');
            if (parts.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid system message ID format'
                });
            }
            
            const messageType = parts[0] + '_' + parts[1]; // 'due_soon' or 'overdue'
            const loanId = parts[2];
            
            // Only insert if not already marked as read
            try {
                await pool.query(
                    `INSERT INTO deleted_system_messages 
                     (user_id, loan_id, message_type, deleted_at) 
                     VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE deleted_at = NOW()`,
                    [req.user.id, loanId, messageType]
                );
                
                return res.json({
                    success: true,
                    message: 'System message marked as read'
                });
            } catch (dbErr) {
                console.error("Database error for system message:", dbErr);
                return res.status(500).json({
                    success: false,
                    message: `Database error: ${dbErr.message}`
                });
            }
        }
        
        // For regular messages
        try {
            // Verify the message exists and belongs to the user
            const [message] = await pool.query(
                'SELECT id FROM messages WHERE id = ? AND user_id = ?',
                [messageId, req.user.id]
            );
            
            if (!message || message.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found or does not belong to user'
                });
            }
            
            // Update the message in the database
            await pool.query(
                'UPDATE messages SET `read` = TRUE WHERE id = ? AND user_id = ?',
                [messageId, req.user.id]
            );
            
            return res.json({
                success: true,
                message: 'Message marked as read'
            });
        } catch (dbErr) {
            console.error("Database error for regular message:", dbErr);
            return res.status(500).json({
                success: false,
                message: `Database error: ${dbErr.message}`
            });
        }
    } catch (err) {
        console.error("Error marking message as read:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
// Create a message (used by the system)
const createMessage = async (req, res) => {
    const { userId, type, title, content, loanId } = req.body;
    
    if (!userId || !type || !title || !content) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }
    
    try {
        const [result] = await pool.query(
            'INSERT INTO messages (user_id, type, title, content, loan_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, type, title, content, loanId || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Message created',
            messageId: result.insertId
        });
    } catch (err) {
        console.error("Error creating message:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { getUserMessages, deleteMessage, markMessageAsRead, createMessage };