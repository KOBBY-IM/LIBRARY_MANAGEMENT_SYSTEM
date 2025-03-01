document.addEventListener('DOMContentLoaded', async function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('login-error-message');
    const submitButton = document.getElementById('login-submit-button');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
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

            // Handle non-JSON responses
            if (!response.ok) {
                const errorData = await response.text(); // Handle HTML or plain text responses
                throw new Error(errorData || 'Login failed. Please try again.');
            }

            const data = await response.json();

            // Debug the response
            console.log('Role:', data.role);
            console.log('Token:', data.token);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                if (data.role === 'admin') {
                    window.location.href = '/pages/admin.html'; 
                } else if (data.role === 'user') {
                    window.location.href = '/pages/user.html';
                }
            } else {
                showError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            showError(err.message || 'An error occurred. Please try again.');
        } finally {
            // Re-enable the submit button and reset its text
            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign In';
        }
    });

    // Helper function to show errors
    function showError(message, type = 'danger') {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
    }
});