// Convert from ES module syntax to regular function
const Users = {
    fetchUsers: async function(token) {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            throw new Error('Failed to fetch users. Please try again.');
        }
    },

    deleteUser: async function(userId, token) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to delete user. Please try again.');
        }
    },

    addUser: async function(user, token) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });

            if (!response.ok) {
                throw new Error('Failed to add user');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to add user. Please try again.');
        }
    }
};

// Make available globally
window.Users = Users;