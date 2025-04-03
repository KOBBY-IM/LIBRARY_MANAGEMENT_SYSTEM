// ======== Utility Functions ========

// ======== Form Validation ========
const FormValidation = {
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validatePassword: function(password) {
        return password.length >= 6;
    },

    validateConfirmPassword: function(password, confirmPassword) {
        return password === confirmPassword;
    }
};
window.FormValidation = FormValidation;

// ======== Error Message ========
function ErrorMessage(containerId) {
    this.containerId = containerId;
    
    this.show = function(message, type = 'danger') {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.textContent = message;
        container.className = `alert alert-${type}`;
        container.style.display = 'block';

        setTimeout(() => {
            container.style.display = 'none';
        }, 3000);
    };
}
window.ErrorMessage = ErrorMessage;

// Simplified global error function
function showError(message, type = 'danger', elementId = 'error-message') {
    const errorMessage = document.getElementById(elementId);
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.className = `alert alert-${type}`;
        errorMessage.style.display = 'block';

        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
}
window.showError = showError;

// ======== BookList Component ========
function BookList(containerId, books, onBorrowClick) {
    this.containerId = containerId;
    this.books = books;
    this.onBorrowClick = onBorrowClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = this.books.map(book => `
            <div class="book-card">
                <h5>${book.title}</h5>
                <p>Author: ${book.author}</p>
                <p>Genre: ${book.genre || 'N/A'}</p>
                <p>Available: ${book.quantity}</p>
                <button class="btn btn-primary borrow-btn" data-id="${book.id}" ${book.quantity <= 0 ? "disabled" : ""}>
                    ${book.quantity <= 0 ? "Out of Stock" : "Borrow"}
                </button>
            </div>
        `).join('');

        // Attach event listeners to borrow buttons
        const self = this;
        container.querySelectorAll('.borrow-btn').forEach(button => {
            button.addEventListener('click', self.onBorrowClick);
        });
    };
}
window.BookList = BookList;

// ======== LoanList Component ========
function LoanList(containerId, loans, onReturnClick) {
    this.containerId = containerId;
    this.loans = loans;
    this.onReturnClick = onReturnClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = this.loans.map(loan => `
            <tr ${loan.is_overdue ? 'class="table-danger"' : loan.days_remaining <= 2 ? 'class="table-warning"' : ''}>
                <td>${loan.title}</td>
                <td>${loan.author}</td>
                <td>${new Date(loan.borrow_date).toLocaleDateString()}</td>
                <td>${new Date(loan.due_date).toLocaleDateString()}</td>
                <td>
                    ${loan.is_overdue ? `<span class="badge bg-danger">Overdue by ${Math.abs(loan.days_remaining)} day(s)</span>` :
                        loan.days_remaining <= 2 ? `<span class="badge bg-warning">Due soon (${loan.days_remaining} day(s))</span>` :
                        `<span class="badge bg-success">${loan.days_remaining} day(s) left</span>`}
                </td>
                <td>
                    <button class="btn btn-sm btn-danger return-btn" data-id="${loan.id}">Return</button>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to return buttons
        const self = this;
        container.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', self.onReturnClick);
        });
    };
}
window.LoanList = LoanList;

// ======== NotificationList Component ========
function NotificationList(containerId, notifications, onMarkAsReadClick, onRenewClick) {
    this.containerId = containerId;
    this.notifications = notifications;
    this.onMarkAsReadClick = onMarkAsReadClick;
    this.onRenewClick = onRenewClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.formatNotificationTime(notification.createdAt)}</span>
                </div>
                <div class="notification-actions">
                    ${notification.type === 'due_soon' ? `<button class="btn btn-sm btn-primary renew-btn" data-loan-id="${notification.loanId}">Renew</button>` : ''}
                    ${!notification.read ? `<button class="btn btn-sm btn-outline-secondary mark-read-btn" data-id="${notification.id}">Mark as Read</button>` : ''}
                </div>
            </div>
        `).join('');

        // Attach event listeners
        const self = this;
        container.querySelectorAll('.mark-read-btn').forEach(button => {
            button.addEventListener('click', self.onMarkAsReadClick);
        });

        container.querySelectorAll('.renew-btn').forEach(button => {
            button.addEventListener('click', self.onRenewClick);
        });
    };

    this.getNotificationIcon = function(type) {
        switch (type) {
            case 'due_soon':
                return 'exclamation-circle';
            case 'overdue':
                return 'exclamation-triangle';
            case 'reservation':
                return 'check-circle';
            case 'new_arrivals':
                return 'info-circle';
            default:
                return 'bell';
        }
    };

    this.formatNotificationTime = function(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            }
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return `${diffDays} days ago`;
        }
    };
}
window.NotificationList = NotificationList;

// ======== Navigation ========
function handleNavigation() {
    document.addEventListener('DOMContentLoaded', function() {
        const navLinks = document.querySelectorAll('.navbar .nav-link');
        const sidebarLinks = document.querySelectorAll('.sidebar-link');

        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    updateActiveLink(targetId, navLinks, sidebarLinks);
                }
            });
        });

        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                updateActiveLink(targetId, navLinks, sidebarLinks);
            });
        });

        function updateActiveLink(targetId, navLinks, sidebarLinks) {
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            sidebarLinks.forEach(sidebarLink => sidebarLink.classList.remove('active'));

            const activeNavLink = document.querySelector(`.navbar .nav-link[href="#${targetId}"]`);
            const activeSidebarLink = document.querySelector(`.sidebar-link[href="#${targetId}"]`);

            if (activeNavLink) activeNavLink.classList.add('active');
            if (activeSidebarLink) activeSidebarLink.classList.add('active');

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                targetSection.classList.add('active');
            }
        }
    });
}
window.handleNavigation = handleNavigation;