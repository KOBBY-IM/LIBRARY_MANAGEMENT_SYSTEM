function UserList(containerId, users, onDeleteClick) {
    this.containerId = containerId;
    this.users = users;
    this.onDeleteClick = onDeleteClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-user-btn" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to delete buttons
        const self = this;
        container.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', self.onDeleteClick);
        });
    };
}


window.UserList = UserList;