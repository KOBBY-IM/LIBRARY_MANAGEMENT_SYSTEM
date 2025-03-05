document.addEventListener('DOMContentLoaded', function () {
    // Registration Form Handling
    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('error-message');

    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // Prevent the form from submitting

            // Get form inputs
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const department = document.getElementById('department').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Clear previous errors
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';

            // Simple validation
            if (!username || !email || !department || !password || !confirmPassword) {
                showError('Please fill in all fields.');
                return;
            }

            if (password !== confirmPassword) {
                showError('Passwords do not match.');
                return;
            }

            if (password.length < 6) {
                showError('Password must be at least 6 characters long.');
                return;
            }

            // Email validation using regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Please enter a valid email address.');
                return;
            }

            // Send registration data to the backend
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, department, password }),
                });

                // Handle non-JSON responses
                if (!response.ok) {
                    const errorData = await response.text(); // Handle HTML or plain text responses
                    throw new Error(errorData || 'Registration failed.');
                }

                const data = await response.json();

                if (response.ok) {
                    showError('Registration successful! You can now sign in.', 'success');
                    signupForm.reset();
                } else {
                    showError(data.message || 'Registration failed.');
                }
            } catch (err) {
                showError('An error occurred. Please try again.');
            }
        });
    }

    // Form field enhancements
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        // Add highlight effect on focus
        input.addEventListener('focus', function () {
            this.parentElement.querySelector('.form-label').style.color = '#4285f4';
        });

        // Remove highlight on blur
        input.addEventListener('blur', function () {
            this.parentElement.querySelector('.form-label').style.color = '';
        });

        // Real-time validation feedback
        if (input.id === 'password') {
            input.addEventListener('input', function () {
                const feedback = document.getElementById('password-feedback');
                if (this.value.length > 0 && this.value.length < 6) {
                    this.style.borderColor = '#e74c3c';
                    feedback.textContent = 'Password must be at least 6 characters long.';
                    feedback.style.color = '#e74c3c';
                } else if (this.value.length >= 6) {
                    this.style.borderColor = '#34a853';
                    feedback.textContent = 'Password is valid.';
                    feedback.style.color = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                    feedback.textContent = '';
                }
            });
        }

        if (input.id === 'confirmPassword') {
            input.addEventListener('input', function () {
                const feedback = document.getElementById('confirmPassword-feedback');
                const password = document.getElementById('password').value;
                if (this.value.length > 0 && this.value !== password) {
                    this.style.borderColor = '#e74c3c';
                    feedback.textContent = 'Passwords do not match.';
                    feedback.style.color = '#e74c3c';
                } else if (this.value.length > 0 && this.value === password) {
                    this.style.borderColor = '#34a853';
                    feedback.textContent = 'Passwords match.';
                    feedback.style.color = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                    feedback.textContent = '';
                }
            });
        }

        if (input.id === 'email') {
            input.addEventListener('blur', function () {
                const feedback = document.getElementById('email-feedback');
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (this.value.length > 0 && !emailRegex.test(this.value)) {
                    this.style.borderColor = '#e74c3c';
                    feedback.textContent = 'Please enter a valid email address.';
                    feedback.style.color = '#e74c3c';
                } else if (this.value.length > 0) {
                    this.style.borderColor = '#34a853';
                    feedback.textContent = 'Email is valid.';
                    feedback.style.color = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                    feedback.textContent = '';
                }
            });
        }
    });

    // Helper function to show errors
    function showError(message, type = 'danger') {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';
    }
});