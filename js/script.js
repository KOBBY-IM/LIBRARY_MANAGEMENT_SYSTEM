// Wait for the DOM to load before executing the script
document.addEventListener('DOMContentLoaded', function() {
    // Registration Form Handling
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent the form from submitting

            // Get form inputs
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const department = document.getElementById('department').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Simple validation
            if (!username || !email || !department || !password || !confirmPassword) {
                showAlert('Please fill in all fields.', 'danger');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Passwords do not match.', 'danger');
                return;
            }

            if (password.length < 6) {
                showAlert('Password must be at least 6 characters long.', 'danger');
                return;
            }

            // Email validation using regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert('Please enter a valid email address.', 'danger');
                return;
            }

            // Simulate registration (in a real app, this would send data to a backend API)
            showAlert('Registration successful! You can now sign in.', 'success');
            
            // Clear the form
            signupForm.reset();

            // Redirect to login page or dashboard (commented out for demo)
            // setTimeout(() => {
            //     window.location.href = 'login.html';
            // }, 1500);

            // TODO: Connect to backend API for actual user registration
        });
    }

    // Form field enhancements
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => {
        // Add highlight effect on focus
        input.addEventListener('focus', function() {
            this.parentElement.querySelector('.form-label').style.color = '#4285f4';
        });

        // Remove highlight on blur
        input.addEventListener('blur', function() {
            this.parentElement.querySelector('.form-label').style.color = '';
        });
        
        // Real-time validation feedback
        if (input.id === 'password') {
            input.addEventListener('input', function() {
                if (this.value.length > 0 && this.value.length < 6) {
                    this.style.borderColor = '#e74c3c';
                } else if (this.value.length >= 6) {
                    this.style.borderColor = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                }
            });
        }
        
        if (input.id === 'confirmPassword') {
            input.addEventListener('input', function() {
                const password = document.getElementById('password').value;
                if (this.value.length > 0 && this.value !== password) {
                    this.style.borderColor = '#e74c3c';
                } else if (this.value.length > 0 && this.value === password) {
                    this.style.borderColor = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                }
            });
        }
        
        if (input.id === 'email') {
            input.addEventListener('blur', function() {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (this.value.length > 0 && !emailRegex.test(this.value)) {
                    this.style.borderColor = '#e74c3c';
                } else if (this.value.length > 0) {
                    this.style.borderColor = '#34a853';
                } else {
                    this.style.borderColor = '#e2e8f0';
                }
            });
        }
    });
});

    