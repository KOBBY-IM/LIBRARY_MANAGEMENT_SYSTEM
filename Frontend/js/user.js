document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/pages/login.html';

    const searchBar = document.getElementById('search-bar');
    const genreFilter = document.getElementById('genre-filter');
    const bookList = document.getElementById('book-list');
    const loanList = document.getElementById('loan-list');
    const errorMessage = document.getElementById('error-message');
    const penaltyStatusElement = document.getElementById('penalty-status');
    const borrowLimitElement = document.getElementById('borrow-limit');

    // Function to show error or success messages
    const showError = (message, type = 'danger') => {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
        
        // Hide the message after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    };

    // Search functionality
    searchBar.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        if (searchTerm.length >= 2) {
            // Show loading indicator
            document.getElementById('loading').style.display = 'block';
            fetchBooks(searchTerm);
        } else if (searchTerm.length === 0) {
            fetchBooks();
        }
    });

    // Fetch books
    const fetchBooks = async (searchTerm = '') => {
        try {
            let url = '/api/books';
            if (searchTerm) {
                url = `/api/books/search?searchTerm=${encodeURIComponent(searchTerm)}`;
            }

            document.getElementById('loading').style.display = 'block';
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch books');
            }

            const data = await response.json();
            
            // Check if no books were found
            if (data.data.length === 0 && searchTerm) {
                bookList.innerHTML = `<div class="alert alert-info">No books found matching "${searchTerm}". Try a different search term.</div>`;
            } else {
                renderBooks(data.data);
            }
        } catch (err) {
            showError('Failed to fetch books. Please try again.');
            console.error('Fetch books error:', err);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    };

    // Render books
    const renderBooks = (books) => {
        bookList.innerHTML = books.map(book => `
            <div class="book-card">
                <h5>${book.title}</h5>
                <p>Author: ${book.author}</p>
                <p>Genre: ${book.genre}</p>
                <p>Available: ${book.quantity}</p>
                <button class="btn btn-primary borrow-btn" data-id="${book.id}" ${book.quantity <= 0 ? 'disabled' : ''}>
                    ${book.quantity <= 0 ? 'Out of Stock' : 'Borrow'}
                </button>
            </div>
        `).join('');

        // Add event listeners to borrow buttons
        document.querySelectorAll('.borrow-btn').forEach(button => {
            if (!button.hasAttribute('disabled')) {
                button.addEventListener('click', handleBorrowBook);
            }
        });
    };

    // Handle borrowing a book
    const handleBorrowBook = async (e) => {
        e.preventDefault();
        const bookId = e.target.dataset.id;
        const userId = localStorage.getItem('userId');

        console.log('Attempting to borrow book:', { userId, bookId });

        if (!userId) {
            showError('User ID not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch('/api/loans/borrow', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, bookId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to borrow book');
            }

            showError(data.message || 'Book borrowed successfully!', 'success');
            fetchBooks(); // Refresh the book list
            fetchLoans(); // Refresh the loans list
        } catch (err) {
            showError(err.message || 'Failed to borrow book. Please try again.');
            console.error('Borrow book error:', err);
        }
    };

    // Fetch and display loans
    const fetchLoans = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showError('User ID not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`/api/loans/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch loans');
            }

            const data = await response.json();
            renderLoans(data.data || []);
            
            // Update loan stats and penalty info
            updateLoanStats(data.data || [], data.penaltyInfo);
        } catch (err) {
            showError('Failed to fetch loans. Please try again.');
            console.error('Fetch loans error:', err);
        }
    };

    // Update loan statistics and penalty information
    const updateLoanStats = (loans, penaltyInfo) => {
        const totalLoansElement = document.getElementById('total-loans');
        const activeLoansElement = document.getElementById('active-loans');
        const overdueLoansElement = document.getElementById('overdue-loans');

        if (totalLoansElement) totalLoansElement.textContent = loans.length;
        if (activeLoansElement) activeLoansElement.textContent = loans.length;
        
        // Calculate overdue books
        const overdue = loans.filter(loan => loan.is_overdue).length;
        if (overdueLoansElement) overdueLoansElement.textContent = overdue;
        
        // Update penalty status if the elements exist and penalty info is available
        if (penaltyInfo) {
            if (penaltyStatusElement) {
                let statusClass = 'bg-success';
                if (penaltyInfo.penaltyLevel === 'Severe') {
                    statusClass = 'bg-danger';
                } else if (penaltyInfo.penaltyLevel === 'Moderate') {
                    statusClass = 'bg-warning';
                } else if (penaltyInfo.penaltyLevel === 'Mild') {
                    statusClass = 'bg-info';
                }
                
                penaltyStatusElement.innerHTML = `
                    <div class="penalty-status ${statusClass}">
                        <h6>Penalty Status: ${penaltyInfo.penaltyLevel}</h6>
                        <p>${penaltyInfo.overdueBooks} overdue book(s)</p>
                    </div>
                `;
            }
            
            if (borrowLimitElement) {
                borrowLimitElement.innerHTML = `
                    <div class="borrow-limit-info">
                        <h6>Borrowing Limit: ${penaltyInfo.currentLoans}/${penaltyInfo.maxLoansAllowed}</h6>
                        <div class="progress">
                            <div class="progress-bar ${penaltyInfo.borrowingStatus === 'Limit Reached' ? 'bg-danger' : 'bg-success'}" 
                                 role="progressbar" 
                                 style="width: ${(penaltyInfo.currentLoans / penaltyInfo.maxLoansAllowed) * 100}%" 
                                 aria-valuenow="${penaltyInfo.currentLoans}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${penaltyInfo.maxLoansAllowed}">
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    };

    // Render loans
    const renderLoans = (loans) => {
        if (!loanList) return;
        
        if (loans.length === 0) {
            loanList.innerHTML = '<tr><td colspan="6" class="text-center">No books borrowed yet</td></tr>';
            return;
        }

        loanList.innerHTML = loans.map(loan => {
            const isOverdue = loan.is_overdue;
            const daysRemaining = loan.days_remaining;
            
            let statusBadge;
            if (isOverdue) {
                statusBadge = `<span class="badge bg-danger">Overdue by ${Math.abs(daysRemaining)} day(s)</span>`;
            } else if (daysRemaining <= 2) {
                statusBadge = `<span class="badge bg-warning">Due soon (${daysRemaining} day(s))</span>`;
            } else {
                statusBadge = `<span class="badge bg-success">${daysRemaining} day(s) left</span>`;
            }
            
            return `
            <tr ${isOverdue ? 'class="table-danger"' : daysRemaining <= 2 ? 'class="table-warning"' : ''}>
                <td>${loan.title}</td>
                <td>${loan.author}</td>
                <td>${new Date(loan.borrow_date).toLocaleDateString()}</td>
                <td>${new Date(loan.due_date).toLocaleDateString()}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-danger return-btn" data-id="${loan.id}">Return</button>
                </td>
            </tr>
            `;
        }).join('');

        // Add event listeners to return buttons
        document.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', handleReturnBook);
        });
    };

    // Handle returning a book
    const handleReturnBook = async (e) => {
        const loanId = e.target.dataset.id;

        try {
            const response = await fetch(`/api/loans/return/${loanId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to return book');
            }

            showError(data.message || 'Book returned successfully!', 'success');
            
            // If the book was overdue, display a warning about penalties
            if (data.wasOverdue) {
                showError(`Note: This book was ${data.overdueDays} day(s) overdue. Your borrowing limit has been temporarily reduced.`, 'warning');
            }
            
            fetchLoans(); // Refresh loans
            fetchBooks(); // Refresh book list to show updated quantities
            fetchPenaltyHistory(); // Fetch penalty history if we're on that page
        } catch (err) {
            showError(err.message || 'Failed to return book. Please try again.');
            console.error('Return book error:', err);
        }
    };

    // Fetch penalty history
    const fetchPenaltyHistory = async () => {
        const penaltyHistoryContainer = document.getElementById('penalty-history');
        if (!penaltyHistoryContainer) return; // Skip if we're not on the penalties page
        
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showError('User ID not found. Please log in again.');
            return;
        }
        
        try {
            const response = await fetch(`/api/loans/penalties/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch penalty history');
            }

            const data = await response.json();
            
            if (data.data.length === 0) {
                penaltyHistoryContainer.innerHTML = '<div class="alert alert-info">No penalty history found. Keep returning books on time!</div>';
                return;
            }
            
            // Render the penalty history
            penaltyHistoryContainer.innerHTML = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Book Title</th>
                                <th>Overdue Days</th>
                                <th>Penalty Date</th>
                                <th>Penalty Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(penalty => `
                                <tr>
                                    <td>${penalty.title}</td>
                                    <td>${penalty.overdue_days}</td>
                                    <td>${new Date(penalty.penalty_date).toLocaleDateString()}</td>
                                    <td>
                                        <span class="badge ${
                                            penalty.penalty_level === 'Severe' ? 'bg-danger' :
                                            penalty.penalty_level === 'Moderate' ? 'bg-warning' : 'bg-info'
                                        }">
                                            ${penalty.penalty_level}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            console.error('Fetch penalty history error:', err);
            penaltyHistoryContainer.innerHTML = '<div class="alert alert-danger">Failed to load penalty history.</div>';
        }
    };

    // Genre filter functionality
    if (genreFilter) {
        genreFilter.addEventListener('change', function() {
            const genre = this.value;
            // Implement genre filtering logic
        });
    }

    // Display user name
    const displayUserName = () => {
        const userNameElement = document.getElementById('user-name');
        const userName = localStorage.getItem('userName') || 'User';
        if (userNameElement) userNameElement.textContent = userName;
    };

    // Initialize the page
    displayUserName();
    fetchBooks();
    fetchLoans();
    fetchPenaltyHistory();
});