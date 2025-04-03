document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessageElement = document.getElementById('login-error-message');
    const submitButton = document.getElementById('login-submit-button');

    // Simple error message display function
    function showError(message, type = 'danger') {
        errorMessageElement.textContent = message;
        errorMessageElement.className = `alert alert-${type}`;
        errorMessageElement.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            errorMessageElement.style.display = 'none';
        }, 3000);
    }

    // Login API function
    async function loginUser(username, password, role) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, role }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed. Please check your credentials.');
            }

            return data;
        } catch (err) {
            throw new Error(err.message || 'An error occurred. Please try again.');
        }
    }

    // Form submission handler
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;

        // Clear previous errors
        errorMessageElement.style.display = 'none';

        // Validate fields
        if (!username || !password || !role) {
            showError('Please fill in all fields.');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        try {
            // Call the login API
            const response = await loginUser(username, password, role);
            
            // Save user info to localStorage
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response.user.id);
            localStorage.setItem('role', response.role);

            // Show success message
            showError('Login successful. Redirecting...', 'success');

            // Redirect based on role
            setTimeout(() => {
                if (response.role === 'admin') {
                    window.location.href = '/pages/admin.html';
                } else if (response.role === 'user') {
                    window.location.href = '/pages/user.html';
                }
            }, 1000);
        } catch (err) {
            showError(err.message || 'An error occurred. Please try again.');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign In';
        }
    });
});