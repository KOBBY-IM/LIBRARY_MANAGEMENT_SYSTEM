document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed'); // Debugging line

    const token = localStorage.getItem('token');
    console.log('Token:', token); // Debugging line

    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const editBookForm = document.getElementById('editBookForm');
    const errorMessage = document.getElementById('error-message');
    const submitButton = document.getElementById('edit-book-submit-button');

    // Get the book ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (!bookId) {
        showError('Invalid book ID.', 'danger');
        return;
    }

    // Fetch book details
    const fetchBookDetails = async () => {
        try {
            console.log('Fetching book details...'); // Debugging line
            const response = await fetch(`/api/books/${bookId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Response status:', response.status); // Debugging line

            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.', 'danger');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 3000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch book details.');
            }

            const result = await response.json();
            console.log('API Response Data:', result); // Debugging line

            if (result.success && result.data) {
                const book = result.data;
                // Pre-fill the form with book details
                document.getElementById('title').value = book.title;
                document.getElementById('author').value = book.author;
                document.getElementById('isbn').value = book.isbn;
                document.getElementById('genre').value = book.genre;
                document.getElementById('quantity').value = book.quantity;
            } else {
                showError('No data found for this book.', 'danger');
            }
        } catch (err) {
            console.error('Error fetching book details:', err);
            showError('Failed to load book details. Please try again.', 'danger');
        }
    };

    // Handle form submission
    editBookForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(editBookForm);
        const book = Object.fromEntries(formData.entries());

        // Validate fields
        if (!book.title || !book.author || !book.isbn || !book.genre || !book.quantity) {
            showError('Please fill in all fields.', 'danger');
            return;
        }

        // Disable the submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(book),
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                showError('Your session has expired. Please log in again.', 'danger');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 3000);
                return;
            }

            if (response.ok) {
                showError('Book updated successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/pages/admin.html'; // Redirect to admin page
                }, 2000);
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to update book. Please try again.', 'danger');
            }
        } catch (err) {
            console.error('Error updating book:', err);
            showError('An error occurred. Please try again.', 'danger');
        } finally {
            // Re-enable the submit button and reset its text
            submitButton.disabled = false;
            submitButton.innerHTML = 'Update Book';
        }
    });

    // Helper function to show errors
    function showError(message, type = 'danger') {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
    }

    // Initial fetch of book details
    fetchBookDetails();
});