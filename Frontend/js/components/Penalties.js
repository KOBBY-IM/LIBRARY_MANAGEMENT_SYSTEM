// Convert from ES module syntax to regular function
const Penalties = {
    fetchPenaltyHistory: async function(userId, token) {
        try {
            const response = await fetch(`/api/loans/penalties/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch penalty history');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to fetch penalty history. Please try again.');
        }
    },

    fetchPenaltyPoints: async function(userId, token) {
        try {
            const response = await fetch(`/api/loans/penalties/${userId}/points`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch penalty points');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to fetch penalty points. Please try again.');
        }
    }
};

// Make available globally
window.Penalties = Penalties;