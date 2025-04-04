// BookList
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

        // Attach event listeners to borrow buttons - directly call handler without confirmation
        const self = this;
        container.querySelectorAll('.borrow-btn').forEach(button => {
            button.addEventListener('click', function() {
                const bookId = this.dataset.id;
                
                // Call the handler directly
                self.onBorrowClick(bookId);
            });
        });
    };
}


window.BookList = BookList;
