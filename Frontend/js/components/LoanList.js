function LoanList(containerId, loans, onReturnClick) {
    this.containerId = containerId;
    this.loans = loans;
    this.onReturnClick = onReturnClick;
    
    this.render = function() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.loans || this.loans.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No active loans</td></tr>';
            return;
        }

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

        // Attach event listeners to return buttons WITHOUT confirmation dialog
        const self = this;
        container.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', function() {
                const loanId = this.dataset.id;
                
                // Show processing state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Returning...';
                
                // Call the handler directly without confirmation
                self.onReturnClick(loanId);
            });
        });
    };
}

window.LoanList = LoanList;