document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/login.html';

    const searchBar = document.getElementById('search-bar');
    const bookList = document.getElementById('book-list');
    const loanList = document.getElementById('loan-list');

    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Show loading state
    function showLoading(container) {
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    // Fetch and display books
    const fetchBooks = async () => {
        showLoading(bookList);
        try {
            const response = await fetch('/api/books', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const books = await response.json();
            bookList.innerHTML = books.map(book => `
                <div class="book-card">
                    <h5>${book.title}</h5>
                    <p>Author: ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    <p>Available: ${book.quantity}</p>
                    <button class="btn borrow-btn" data-id="${book.id}" ${book.quantity === 0 ? 'disabled' : ''}>
                        ${book.quantity === 0 ? 'Out of Stock' : 'Borrow'}
                    </button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching books:', err);
            showError('Failed to load books. Please try again.');
        }
    };

    // Borrow book
    bookList.addEventListener('click', async function (e) {
        if (e.target.classList.contains('borrow-btn')) {
            const bookId = e.target.getAttribute('data-id');
            const userId = JSON.parse(atob(token.split('.')[1])).id;

            try {
                const response = await fetch('/api/loans/borrow', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId, bookId }),
                });
                if (response.ok) {
                    fetchBooks();
                    fetchLoans();
                } else {
                    showError('Failed to borrow the book. Please try again.');
                }
            } catch (err) {
                console.error('Error borrowing book:', err);
                showError('Failed to borrow the book. Please try again.');
            }
        }
    });

    // Fetch and display loans
    const fetchLoans = async () => {
        showLoading(loanList);
        const userId = JSON.parse(atob(token.split('.')[1])).id;
        try {
            const response = await fetch(`/api/loans/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const loans = await response.json();
            loanList.innerHTML = loans.map(loan => `
                <tr>
                    <td>${loan.title}</td>
                    <td>${loan.author}</td>
                    <td>${loan.due_date}</td>
                    <td><button class="btn btn-danger return-btn" data-id="${loan.id}">Return</button></td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error fetching loans:', err);
            showError('Failed to load loans. Please try again.');
        }
    };

    // Return book
    loanList.addEventListener('click', async function (e) {
        if (e.target.classList.contains('return-btn')) {
            const loanId = e.target.getAttribute('data-id');

            try {
                const response = await fetch(`/api/loans/return/${loanId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    fetchBooks();
                    fetchLoans();
                } else {
                    showError('Failed to return the book. Please try again.');
                }
            } catch (err) {
                console.error('Error returning book:', err);
                showError('Failed to return the book. Please try again.');
            }
        }
    });

    // Search functionality
    searchBar.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const bookCards = document.querySelectorAll('.book-card');
        bookCards.forEach(card => {
            const title = card.querySelector('h5').textContent.toLowerCase();
            const author = card.querySelector('p').textContent.toLowerCase();
            const genre = card.querySelectorAll('p')[1].textContent.toLowerCase();
            if (title.includes(searchTerm) || author.includes(searchTerm) || genre.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '../Index.html';
    });

      // Helper function to show errors
      function showError(message, type = 'danger') {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
    }


    fetchBooks();
    fetchLoans();
});