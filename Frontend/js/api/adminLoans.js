// AdminLoans API Module
// This module provides functions to interact with the admin loans API.
// It includes fetching all loans, returning a book, formatting dates, and calculating loan status.


const AdminLoans = {
    fetchAllLoans: async function(filters = {}, token) {
        try {
            // Construct query string from filters
            const queryParams = new URLSearchParams();
            if (filters.status && filters.status !== 'all') {
                queryParams.append('status', filters.status);
            }
            if (filters.search) {
                queryParams.append('search', filters.search);
            }
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
            
            const response = await fetch(`/api/loans/all${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch loans');
            }

            return await response.json();
        } catch (err) {
            throw new Error('Failed to fetch loans. Please try again.');
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

    // Format date for display (helper function)
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    },

    // Calculate loan status
    calculateLoanStatus: function(loan) {
        if (loan.returned) {
            return {
                status: 'returned',
                label: 'Returned',
                badgeClass: 'bg-secondary'
            };
        } else if (loan.is_overdue) {
            return {
                status: 'overdue',
                label: `Overdue by ${Math.abs(loan.days_remaining)} day(s)`,
                badgeClass: 'bg-danger'
            };
        } else if (loan.days_remaining <= 2) {
            return {
                status: 'due-soon',
                label: `Due soon (${loan.days_remaining} day(s))`,
                badgeClass: 'bg-warning'
            };
        } else {
            return {
                status: 'active',
                label: `${loan.days_remaining} day(s) left`,
                badgeClass: 'bg-success'
            };
        }
    }
};

// Make it available globally
window.AdminLoans = AdminLoans;