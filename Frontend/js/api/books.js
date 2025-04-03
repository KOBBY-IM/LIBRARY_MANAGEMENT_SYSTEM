// This module provides functions to interact with the book API.
// It includes functions to fetch all books, delete a book, add a new book, and edit an existing book.
const Books = {
    fetchBooks: async function(token) {
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
    },

    deleteBook: async function(bookId, token) {
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
    },

    addBook: async function(book, token) {
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

            return true;
        } catch (err) {
            throw new Error('Failed to add book. Please try again.');
        }
    },

    editBook: async function(bookId, book, token) {
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
};

// Make available globally
window.Books = Books;