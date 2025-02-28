document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'pages/login.html';

    const addBookForm = document.getElementById('addBookForm');
    const bookList = document.getElementById('bookList');

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
            console.error('Error fetching books:', err);
        }
    };

    // Add book
    addBookForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(addBookForm);
        const book = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(book),
            });
            if (response.ok) {
                fetchBooks();
                addBookForm.reset();
            }
        } catch (err) {
            console.error('Error adding book:', err);
        }
    });

    fetchBooks();
});