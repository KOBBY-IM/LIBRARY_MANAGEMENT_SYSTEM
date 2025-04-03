// Convert from ES module syntax to regular function
const Notifications = {
    fetchNotifications: async function(userId, token) {
        try {
            const response = await fetch(`/api/notifications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            return data.notifications;
        } catch (err) {
            throw new Error('Failed to fetch notifications. Please try again.');
        }
    },

    markNotificationAsRead: async function(notificationId, token) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to mark notification as read. Please try again.');
        }
    }
};

// Make available globally
window.Notifications = Notifications;