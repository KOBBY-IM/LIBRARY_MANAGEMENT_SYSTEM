// Messages API Module
const Messages = {
    fetchMessages: async function(userId, token) {
        try {
            const response = await fetch(`/api/messages/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            return data.messages;
        } catch (err) {
            throw new Error('Failed to fetch messages. Please try again.');
        }
    },

    deleteMessage: async function(messageId, token) {
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete message');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to delete message. Please try again.');
        }
    },

    markAsRead: async function(messageId, token) {
        try {
            const response = await fetch(`/api/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark message as read');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to mark message as read. Please try again.');
        }
    }
};

// Make available globally
window.Messages = Messages;