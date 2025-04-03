// Convert from ES module syntax to regular function
const Loans = {
    fetchLoans: async function(userId, token) {
        try {
            const response = await fetch(`/api/loans/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch loans');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            throw new Error('Failed to fetch loans. Please try again.');
        }
    },

    borrowBook: async function(userId, bookId, token) {
        try {
            const response = await fetch('/api/loans/borrow', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, bookId }),
            });

            if (!response.ok) {
                throw new Error('Failed to borrow book');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to borrow book. Please try again.');
        }
    },

    returnBook: async function(loanId, token) {
        try {
            const response = await fetch(`/api/loans/return/${loanId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to return book');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to return book. Please try again.');
        }
    },

    renewBook: async function(loanId, token) {
        try {
            const response = await fetch(`/api/loans/renew/${loanId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to renew book');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to renew book. Please try again.');
        }
    }
};

// Make available globally
window.Loans = Loans;