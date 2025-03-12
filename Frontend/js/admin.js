document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/pages/login.html';
  
    const addBookForm = document.getElementById('addBookForm');
    const bookList = document.getElementById('bookList');
    const bookSearch = document.getElementById('bookSearch');
  
    const addUserForm = document.getElementById('addUserForm');
    const userList = document.getElementById('userList');
    const userSearch = document.getElementById('userSearch');
  
    const errorMessage = document.getElementById('error-message');
    const userErrorMessage = document.getElementById('user-error-message');
    
    // Store all books and users for filtering
    let allBooks = [];
    let allUsers = [];
  
    // Fetch and display books
    const fetchBooks = async () => {
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
            allBooks = data.data; // Store all books
            renderBooks(allBooks); // Display all books initially
        } catch (err) {
            showError('Failed to fetch books. Please try again.');
        }
    };
  
    // Render books in the table
    const renderBooks = (books) => {
        bookList.innerHTML = books.map(book => `
            <tr data-id="${book.id}">
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.isbn}</td>
                <td>${book.genre}</td>
                <td>${book.quantity}</td>
                <td>
                    <a href="/pages/editBook.html?id=${book.id}" class="btn btn-warning">Edit</a>
                    <button class="btn btn-danger delete-book-btn" data-id="${book.id}">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to delete buttons after rendering
        document.querySelectorAll('.delete-book-btn').forEach(button => {
            button.addEventListener('click', function() {
                deleteBook(this.getAttribute('data-id'));
            });
        });
    };
  
    // Delete book function
    const deleteBook = async (bookId) => {
        if (confirm('Are you sure you want to delete this book?')) {
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
  
                fetchBooks();
                showError('Book deleted successfully!', 'success');
            } catch (err) {
                showError('Failed to delete book. Please try again.');
            }
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
  
            if (!response.ok) {
                throw new Error('Failed to add book');
            }
  
            fetchBooks();
            addBookForm.reset();
            showError('Book added successfully!', 'success');
        } catch (err) {
            showError('Failed to add book. Please try again.');
        }
    });
  
    // Fetch and display users
    const fetchUsers = async () => {
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
            allUsers = data.data; // Store all users
            renderUsers(allUsers); // Display all users initially
        } catch (err) {
            showUserError('Failed to fetch users. Please try again.');
        }
    };
  
    // Render users in the table
    const renderUsers = (users) => {
        userList.innerHTML = users.map(user => `
            <tr data-id="${user.id}">
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to delete buttons after rendering
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                deleteUser(this.getAttribute('data-id'));
            });
        });
    };
  
    // Delete user function
    const deleteUser = async (userId) => {
        if (confirm('Are you sure you want to delete this user?')) {
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
  
                fetchUsers();
                showUserError('User deleted successfully!', 'success');
            } catch (err) {
                showUserError('Failed to delete user. Please try again.');
                console.error('Error deleting user:', err);
            }
        }
    };
  
    // Add user
    addUserForm.addEventListener('submit', async function(e) {
      e.preventDefault();
  
      // Disable submit button to prevent multiple submissions
      const submitButton = document.getElementById('add-user-submit-button');
      submitButton.disabled = true;
      submitButton.innerHTML = "Adding...";
  
      try {
          // Get form values
          const username = document.getElementById('username').value;
          const email = document.getElementById('email').value;
          const department = document.getElementById('department').value;
          const password = document.getElementById('password').value;
          const role = document.getElementById('role').value;
  
          console.log("Form Data:", { username, email, department, password, role });
  
          const response = await fetch('/api/users', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  username,
                  email,
                  department: department || null,
                  password,
                  role
              })
          });
  
          const data = await response.json();
          console.log("Response:", data);
  
          if (response.ok) {
              fetchUsers(); // Refresh the user list
              addUserForm.reset(); // Clear the form
              showUserError('User added successfully!', 'success');
          } else {
              showUserError(data.message || 'Failed to add user');
          }
      } catch (err) {
          console.error("Error adding user:", err);
          showUserError('An error occurred. Please try again.');
      } finally {
          // Re-enable the submit button
          submitButton.disabled = false;
          submitButton.innerHTML = "Add User";
      }
    });
  
    // Book search functionality
    bookSearch.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      if (searchTerm === '') {
        renderBooks(allBooks);
        return;
      }
      
      const filteredBooks = allBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) || 
        book.author.toLowerCase().includes(searchTerm) || 
        book.genre.toLowerCase().includes(searchTerm)
      );
      
      renderBooks(filteredBooks);
    });
  
    // User search functionality
    userSearch.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      if (searchTerm === '') {
        renderUsers(allUsers);
        return;
      }
      
      const filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) || 
        user.email.toLowerCase().includes(searchTerm)
      );
      
      renderUsers(filteredUsers);
    });
  
    // Show book error/success message
    const showError = (message, type = 'error') => {
      errorMessage.textContent = message;
      errorMessage.className = type === 'success' 
          ? 'alert alert-success' 
          : 'alert alert-danger';
      errorMessage.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
          errorMessage.style.display = 'none';
      }, 3000);
    };
    
    // Show user error/success message
    const showUserError = (message, type = 'error') => {
      userErrorMessage.textContent = message;
      userErrorMessage.className = type === 'success' 
          ? 'alert alert-success' 
          : 'alert alert-danger';
      userErrorMessage.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
          userErrorMessage.style.display = 'none';
      }, 3000);
    };
  
    // Initial fetch of books and users
    fetchBooks();
    fetchUsers();
  });