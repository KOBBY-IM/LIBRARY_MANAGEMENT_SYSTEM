// BookList.js conversion
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
                <p>Genre: ${book.genre}</p>
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

// ErrorMessage.js conversion
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

// LoanList.js conversion
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

// NotificationList.js conversion
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

// Make them globally available
window.BookList = BookList;
window.ErrorMessage = ErrorMessage;
window.LoanList = LoanList;
window.NotificationList = NotificationList;