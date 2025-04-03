// This module handles user authentication, including registration and login.
// It provides functions to register a new user and log in an existing user.

const Auth = {
    register: async function(username, email, department, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, department, password }),
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            return await response.json();
        } catch (err) {
            throw new Error('An error occurred. Please try again.');
        }
    },

    login: async function(username, password, role) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, role }),
            });

            if (!response.ok) {
                throw new Error('Login failed. Please check your credentials.');
            }

            return await response.json();
        } catch (err) {
            throw new Error('An error occurred. Please try again.');
        }
    }
};

window.Auth = Auth;