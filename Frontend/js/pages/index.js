document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('signupForm');
    const errorMessageElement = document.getElementById('error-message');

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

    // Form validation functions
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePassword(password) {
        return password.length >= 6;
    }

    function validateConfirmPassword(password, confirmPassword) {
        return password === confirmPassword;
    }

    // Registration function
    async function register(username, email, department, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, department, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Registration failed');
            }

            return await response.json();
        } catch (err) {
            throw new Error(err.message || 'An error occurred. Please try again.');
        }
    }

    // Form submission handler
    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const department = document.getElementById('department').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Clear previous errors
            errorMessageElement.style.display = 'none';

            // Validate fields
            if (!username || !email || !department || !password || !confirmPassword) {
                showError('Please fill in all fields.');
                return;
            }

            if (!validateEmail(email)) {
                showError('Please enter a valid email address.');
                return;
            }

            if (!validatePassword(password)) {
                showError('Password must be at least 6 characters long.');
                return;
            }

            if (!validateConfirmPassword(password, confirmPassword)) {
                showError('Passwords do not match.');
                return;
            }

            try {
                const response = await register(username, email, department, password);
                showError('Registration successful! You can now sign in.', 'success');
                signupForm.reset();
                
                // Redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } catch (err) {
                showError(err.message || 'An error occurred. Please try again.');
            }
        });
    }
});