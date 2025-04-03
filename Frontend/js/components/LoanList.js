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