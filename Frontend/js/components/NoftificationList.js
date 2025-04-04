function NotificationList(containerId, notifications, onMarkAsReadClick, onRenewClick) {
    this.containerId = containerId;
    this.notifications = notifications;
    this.onMarkAsReadClick = onMarkAsReadClick;
    this.onRenewClick = onRenewClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.notifications || this.notifications.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No notifications</div>';
            return;
        }

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

        // Attach event listeners - without any confirm dialogs
        const self = this;
        container.querySelectorAll('.mark-read-btn').forEach(button => {
            button.addEventListener('click', function() {
                const notificationId = this.dataset.id;
                
                // Show processing state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                
                // Call handler directly
                self.onMarkAsReadClick(notificationId);
            });
        });

        container.querySelectorAll('.renew-btn').forEach(button => {
            button.addEventListener('click', function() {
                const loanId = this.dataset.loanId;
                
                // Show processing state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Renewing...';
                
                // Call handler directly
                self.onRenewClick(loanId);
            });
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
        if (!timestamp) return "Unknown";
        
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

// Make it globally available
window.NotificationList = NotificationList;