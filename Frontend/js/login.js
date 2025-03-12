document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('login-error-message');
    const submitButton = document.getElementById('login-submit-button');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;

        // Clear previous errors
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';

        // Validate fields
        if (!username || !password || !role) {
            showError('Please fill in all fields.');
            return;
        }

        // Disable the submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, role }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed. Please check your credentials.');
            }

            const data = await response.json();

            // Store token and user details in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('role', data.role);

            // Redirect based on role
            if (data.role === 'admin') {
                window.location.href = '/pages/admin.html';
            } else if (data.role === 'user') {
                window.location.href = '/pages/user.html';
            }
        } catch (err) {
            showError(err.message || 'An error occurred. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign In';
        }
    });

    function showError(message, type = 'danger') {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
    }
});