document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/login.html';

    const searchBar = document.getElementById('search-bar');
    const bookList = document.getElementById('book-list');
    const loanList = document.getElementById('loan-list');

    // Fetch and display books
    const fetchBooks = async () => {
        try {
            const response = await fetch('/api/books', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const books = await response.json();
            bookList.innerHTML = books.map(book => `
                <div class="book-card">
                    <h5>${book.title}</h5>
                    <p>Author: ${book.author}</p>
                    <p>Genre: ${book.genre}</p>
                    <p>Available: ${book.quantity}</p>
                    <button class="btn borrow-btn" data-id="${book.id}">Borrow</button>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching books:', err);
        }
    };

    // Borrow book
    bookList.addEventListener('click', async function (e) {
        if (e.target.classList.contains('borrow-btn')) {
            const bookId = e.target.getAttribute('data-id');
            const userId = JSON.parse(atob(token.split('.')[1])).id; // Extract user ID from token

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
                }
            } catch (err) {
                console.error('Error borrowing book:', err);
            }
        }
    });

    // Fetch and display loans
    const fetchLoans = async () => {
        const userId = JSON.parse(atob(token.split('.')[1])).id; // Extract user ID from token
        try {
            const response = await fetch(`/api/loans/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
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
        }
    };

    // Return book
    loanList.addEventListener('click', async function (e) {
        if (e.target.classList.contains('return-btn')) {
            const loanId = e.target.getAttribute('data-id');

            try {
                const response = await fetch(`/api/loans/return/${loanId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    fetchBooks();
                    fetchLoans();
                }
            } catch (err) {
                console.error('Error returning book:', err);
            }
        }
    });

    fetchBooks();
    fetchLoans();
});