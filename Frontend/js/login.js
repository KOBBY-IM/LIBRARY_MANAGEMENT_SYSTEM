document.addEventListener('DOMContentLoaded', async function () {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, role }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                if (data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else if (data.role === 'user') {
                    window.location.href = '/user.html';
                }
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (err) {
            alert('An error occurred. Please try again.');
        }
    });
});