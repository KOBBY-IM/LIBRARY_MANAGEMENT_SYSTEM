document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/pages/login.html';

    const editBookForm = document.getElementById('editBookForm');
    const errorMessageElement = document.getElementById('error-message');
    const submitButton = document.getElementById('edit-book-submit-button');

    // Helper function to show error messages
    function showError(message, type = 'danger') {
        if (!errorMessageElement) return;
        
        errorMessageElement.textContent = message;
        errorMessageElement.className = `alert alert-${type}`;
        errorMessageElement.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                errorMessageElement.style.display = 'none';
            }, 3000);
        }
    }

    // Get the book ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        showError('Invalid book ID.', 'danger');
        return;
    }

    // Fetch book details by ID
    async function fetchBookDetails(bookId) {
        try {
            const response = await fetch(`/api/books/${bookId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load book details');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            throw new Error('Failed to load book details. Please try again.');
        }
    }

    // Edit book function
    async function editBook(bookId, book) {
        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(book),
            });

            if (!response.ok) {
                throw new Error('Failed to update book');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to update book. Please try again.');
        }
    }

    // Fetch and display book details
    async function fetchAndDisplayBookDetails() {
        try {
            const book = await fetchBookDetails(bookId);
            document.getElementById('title').value = book.title;
            document.getElementById('author').value = book.author;
            document.getElementById('isbn').value = book.isbn || '';
            document.getElementById('genre').value = book.genre || '';
            document.getElementById('quantity').value = book.quantity;
        } catch (err) {
            showError('Failed to load book details. Please try again.', 'danger');
        }
    }

    // Handle form submission
    if (editBookForm) {
        editBookForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = new FormData(editBookForm);
            const book = Object.fromEntries(formData.entries());

            if (!book.title || !book.author || !book.quantity) {
                showError('Please fill in all required fields.', 'danger');
                return;
            }

            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

            try {
                await editBook(bookId, book);
                showError('Book updated successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/pages/admin.html';
                }, 2000);
            } catch (err) {
                showError('Failed to update book. Please try again.', 'danger');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Update Book';
            }
        });
    }

    // Initial fetch of book details
    fetchAndDisplayBookDetails();
});