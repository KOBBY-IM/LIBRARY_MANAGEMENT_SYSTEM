document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/pages/login.html';

    const addBookForm = document.getElementById('addBookForm');
    const bookSearch = document.getElementById('bookSearch');
    const addUserForm = document.getElementById('addUserForm');
    const userSearch = document.getElementById('userSearch');
    const errorMessageElement = document.getElementById('error-message');
    const userErrorMessageElement = document.getElementById('user-error-message');

    let allBooks = [];
    let allUsers = [];

    // Error message helper
    function showError(message, type = 'danger', element = errorMessageElement) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }

    // Book API functions
    async function fetchBooks() {
        try {
            const response = await fetch('/api/books', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch books');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            throw new Error('Failed to fetch books. Please try again.');
        }
    }

    async function deleteBook(bookId) {
        try {
            const response = await fetch(`/api/books/${bookId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete book');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to delete book. Please try again.');
        }
    }

    async function addBook(book) {
        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(book),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add book');
            }

            return true;
        } catch (err) {
            throw err;
        }
    }

    // User API functions
    async function fetchUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            throw new Error('Failed to fetch users. Please try again.');
        }
    }

    async function deleteUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            return true;
        } catch (err) {
            throw new Error('Failed to delete user. Please try again.');
        }
    }

    async function addUser(user) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user),
            });

            // Parse the response regardless of status code
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add user');
            }

            return true;
        } catch (err) {
            throw err;
        }
    }

    // Book list rendering
    function renderBookList(books) {
        const container = document.getElementById('bookList');
        if (!container) return;

        container.innerHTML = books.map(book => `
            <tr>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.genre || 'N/A'}</td>
                <td>${book.quantity}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-book-btn" data-id="${book.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-book-btn" data-id="${book.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to buttons
        container.querySelectorAll('.delete-book-btn').forEach(button => {
            button.addEventListener('click', handleDeleteBook);
        });

        container.querySelectorAll('.edit-book-btn').forEach(button => {
            button.addEventListener('click', function() {
                window.location.href = `/pages/editBook.html?id=${this.dataset.id}`;
            });
        });
    }

    // User list rendering
    function renderUserList(users) {
        const container = document.getElementById('userList');
        if (!container) return;

        container.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to buttons
        container.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', handleDeleteUser);
        });
    }

    // Event handlers
    async function handleDeleteBook(event) {
        const bookId = event.target.dataset.id;
        if (confirm('Are you sure you want to delete this book?')) {
            try {
                await deleteBook(bookId);
                fetchAndDisplayBooks();
                showError('Book deleted successfully!', 'success');
            } catch (err) {
                showError('Failed to delete book. Please try again.');
            }
        }
    }

    async function handleDeleteUser(event) {
        const userId = event.target.dataset.id;
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUser(userId);
                fetchAndDisplayUsers();
                showError('User deleted successfully!', 'success', userErrorMessageElement);
            } catch (err) {
                showError('Failed to delete user. Please try again.', 'danger', userErrorMessageElement);
            }
        }
    }

    // Data fetching functions
    async function fetchAndDisplayBooks() {
        try {
            allBooks = await fetchBooks();
            renderBookList(allBooks);
        } catch (err) {
            showError('Failed to fetch books. Please try again.');
        }
    }

    async function fetchAndDisplayUsers() {
        try {
            allUsers = await fetchUsers();
            renderUserList(allUsers);
        } catch (err) {
            showError('Failed to fetch users. Please try again.', 'danger', userErrorMessageElement);
        }
    }

    // Form event listeners
    if (addBookForm) {
        addBookForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(addBookForm);
            const book = Object.fromEntries(formData.entries());

            // Validate required fields
            if (!book.title || !book.author || !book.quantity) {
                showError('Title, author, and quantity are required.');
                return;
            }

            try {
                await addBook(book);
                fetchAndDisplayBooks();
                addBookForm.reset();
                showError('Book added successfully!', 'success');
            } catch (err) {
                showError(err.message || 'Failed to add book. Please try again.');
            }
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            
            // Get form values
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const department = document.getElementById('department').value.trim() || null;
            const password = document.getElementById('password').value.trim();
            const role = document.getElementById('role').value.trim();
            
            // Client-side validation
            if (!username || !email || !password || !role) {
                showError('Username, email, password, and role are required.', 'danger', userErrorMessageElement);
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address.', 'danger', userErrorMessageElement);
                return;
            }
            
            // Password validation
            if (password.length < 6) {
                showError('Password must be at least 6 characters long.', 'danger', userErrorMessageElement);
                return;
            }
            
            const user = { username, email, department, password, role };
            console.log("Submitting user data:", user); // Debug log
            
            // Disable submit button and show loading state
            const submitButton = document.getElementById('add-user-submit-button');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
            }

            try {
                await addUser(user);
                fetchAndDisplayUsers();
                addUserForm.reset();
                showError('User added successfully!', 'success', userErrorMessageElement);
            } catch (err) {
                showError(err.message || 'Failed to add user. Please try again.', 'danger', userErrorMessageElement);
            } finally {
                // Reset button state
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Add User';
                }
            }
        });
    }

    // Search functionality
    if (bookSearch) {
        bookSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            if (!allBooks || !allBooks.length) return;
            
            const filteredBooks = allBooks.filter(book => 
                book.title.toLowerCase().includes(searchTerm) || 
                book.author.toLowerCase().includes(searchTerm) ||
                (book.genre && book.genre.toLowerCase().includes(searchTerm))
            );
            
            renderBookList(filteredBooks);
        });
    }

    if (userSearch) {
        userSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            if (!allUsers || !allUsers.length) return;
            
            const filteredUsers = allUsers.filter(user => 
                user.username.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm)
            );
            
            renderUserList(filteredUsers);
        });
    }

    // Logout functionality
    const logoutLink = document.getElementById('logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('role');
            window.location.href = '/index.html';
        });
    }

    // Initialize page
    fetchAndDisplayBooks();
    fetchAndDisplayUsers();
});