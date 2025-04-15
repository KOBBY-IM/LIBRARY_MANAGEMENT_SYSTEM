function MessageList(containerId, messages, onDeleteClick, onMessageRead) {
    this.containerId = containerId;
    this.messages = messages;
    this.onDeleteClick = onDeleteClick;
    this.onMessageRead = onMessageRead;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.messages || this.messages.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No messages</div>';
            return;
        }

        // Sort messages with unread first, then by date
        const sortedMessages = [...this.messages].sort((a, b) => {
            // First sort by read status (unread first)
            if (!a.read && b.read) return -1;
            if (a.read && !b.read) return 1;
            
            // Then sort by creation date (newest first)
            const dateA = new Date(a.createdAt || Date.now());
            const dateB = new Date(b.createdAt || Date.now());
            return dateB - dateA;
        });
        
        container.innerHTML = sortedMessages.map((message, index) => `
            <div class="message-item ${message.read ? '' : 'unread'}" 
                 data-id="${message.id}" 
                 data-type="${message.type || 'default'}"
                 data-read="${message.read ? 'true' : 'false'}"
                 data-index="${index}">
                <div class="message-icon">
                    <i class="fas fa-${this.getMessageIcon(message.type)}"></i>
                </div>
                <div class="message-content">
                    <h5>${message.title}</h5>
                    <p>${message.message || ''}</p>
                    <span class="message-time">${this.formatMessageTime(message.createdAt)}</span>
                </div>
                <div class="message-actions">
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${message.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add click event to unread message items to mark as read
        const self = this;
        container.querySelectorAll('.message-item.unread').forEach(item => {
            item.addEventListener('click', function(e) {
                // Only trigger if not clicking on delete button
                if (!e.target.closest('.delete-btn')) {
                    const messageId = this.dataset.id;
                    
                    console.log(`Unread message clicked: ID=${messageId}`);
                    
                    // Call onMessageRead with the message ID
                    if (typeof self.onMessageRead === 'function') {
                        self.onMessageRead(messageId);
                    } else {
                        console.error("onMessageRead is not a function:", self.onMessageRead);
                    }
                }
            });
        });

        // Add hover effect to read messages to make them feel interactive
        container.querySelectorAll('.message-item:not(.unread)').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.opacity = '0.9';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.opacity = '';
            });
        });

        // Attach event listeners to delete buttons
        container.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent the message click event
                const messageId = this.dataset.id;
                
                console.log(`Delete button clicked for message ID: ${messageId}`);
                
                // Show processing state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                
                // Find the message item and add a fading out effect
                const messageItem = this.closest('.message-item');
                if (messageItem) {
                    messageItem.style.transition = 'all 0.3s ease-out';
                    messageItem.style.opacity = '0.5';
                    messageItem.style.height = `${messageItem.offsetHeight}px`;
                    
                    setTimeout(() => {
                        messageItem.style.height = '0';
                        messageItem.style.padding = '0';
                        messageItem.style.margin = '0';
                        messageItem.style.overflow = 'hidden';
                    }, 100);
                }
                
                // Call onDeleteClick with the message ID
                if (typeof self.onDeleteClick === 'function') {
                    self.onDeleteClick(messageId);
                } else {
                    console.error("onDeleteClick is not a function:", self.onDeleteClick);
                }
            });
        });
    };

    this.getMessageIcon = function(type) {
        switch (type) {
            case 'due_soon':
                return 'exclamation-circle';
            case 'overdue':
                return 'exclamation-triangle';
            case 'borrow_success':
                return 'check-circle';
            case 'return_success':
                return 'undo';
            case 'penalty':
                return 'dollar-sign';
            default:
                return 'envelope';
        }
    };

    this.formatMessageTime = function(timestamp) {
        if (!timestamp) return "Unknown";
        
        try {
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
        } catch (error) {
            console.error("Error formatting time:", error);
            return "Unknown";
        }
    };
}

// Make it globally available
window.MessageList = MessageList;