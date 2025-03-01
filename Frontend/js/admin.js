document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const addBookForm = document.getElementById('addBookForm');
    const bookList = document.getElementById('bookList');
    const errorMessage = document.getElementById('error-message'); // Ensure this exists in the HTML
    const submitButton = document.getElementById('add-book-submit-button'); // Ensure this exists in the HTML

    // Fetch and display books
    const fetchBooks = async () => {
        try {
            const response = await fetch('/api/books', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Handle unauthorized access
            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.', 'danger');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 3000);
                return;
            }

            const books = await response.json();
            bookList.innerHTML = books.map(book => `
                <tr>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.isbn}</td>
                    <td>${book.genre}</td>
                    <td>${book.quantity}</td>
                    <td>
                        <button class="btn btn-warning" onclick="editBook(${book.id})">Edit</button>
                        <button class="btn btn-danger" onclick="deleteBook(${book.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            showError('Error fetching books. Please try again.', 'danger');
        }
    };

    // Add book
    addBookForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(addBookForm);
        const book = Object.fromEntries(formData.entries());

        // Validate fields
        if (!book.title || !book.author || !book.isbn || !book.genre || !book.quantity) {
            showError('Please fill in all fields.', 'danger');
            return;
        }

        // Disable the submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(book),
            });

            // Handle unauthorized access
            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.', 'danger');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 3000);
                return;
            }

            if (response.ok) {
                fetchBooks();
                addBookForm.reset();
                showError('Book added successfully!', 'success');
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to add book. Please try again.', 'danger');
            }
        } catch (err) {
            showError('An error occurred. Please try again.', 'danger');
        } finally {
            // Re-enable the submit button and reset its text
            submitButton.disabled = false;
            submitButton.innerHTML = 'Add Book';
        }
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

    // Initial fetch of books
    fetchBooks();
});