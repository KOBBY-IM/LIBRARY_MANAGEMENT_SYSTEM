// ErrorMessage
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