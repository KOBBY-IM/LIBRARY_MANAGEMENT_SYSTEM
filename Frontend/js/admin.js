document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded");
  const token = localStorage.getItem("token");
  console.log("Token:", token); //debugging line
  if (!token) {
    window.location.href = "/pages/login.html";
    return;
  }

  const addBookForm = document.getElementById("addBookForm");
  const bookList = document.getElementById("bookList");
  const bookSearch = document.getElementById("bookSearch");

  const addUserForm = document.getElementById("addUserForm");
  const userList = document.getElementById("userList");
  const userSearch = document.getElementById("userSearch");

  // Show error message
  const errorMessage = document.getElementById("error-message");
  const submitButton = document.getElementById("add-book-submit-button");

  // Fetch and display books
  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/books", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        showError("Your session has expired. Please log in again.", "danger");
        setTimeout(() => {
          window.location.href = "/pages/login.html";
        }, 3000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch books from the server."
        );
      }

      const result = await response.json();
      //console.log("API Response Data:", result); // Debugging line

      if (result.success && result.data) {
        bookList.innerHTML = result.data
          .map(
            (book) => `
                    <tr>
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.isbn}</td>
                        <td>${book.genre}</td>
                        <td>${book.quantity}</td>
                        <td>
                            <button class="btn btn-warning" onclick="editBook(${book.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteBook(${book.id})">Delete</button>
                        </td>
                    </tr>
                `
          )
          .join("");
      } else {
        console.error("No data found in API response");
      }
    } catch (err) {
      showError("Error fetching books. Please try again.", "danger");
    }
  };

  // search books
  bookSearch.addEventListener("input", function (e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = bookList.querySelectorAll("tr");

    rows.forEach((row) => {
      const title = row
        .querySelector("td:nth-child(1)")
        .textContent.toLowerCase();
      const author = row
        .querySelector("td:nth-child(2)")
        .textContent.toLowerCase();
      const genre = row
        .querySelector("td:nth-child(4)")
        .textContent.toLowerCase();

      if (
        title.includes(searchTerm) ||
        author.includes(searchTerm) ||
        genre.includes(searchTerm)
      ) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });

  // Add book
  addBookForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(addBookForm);
    const book = Object.fromEntries(formData.entries());

    // Validate fields
    if (
      !book.title ||
      !book.author ||
      !book.isbn ||
      !book.genre ||
      !book.quantity
    ) {
      showError("Please fill in all fields.", "danger");
      return;
    }

    // Disable the submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(book),
      });

      // Handle unauthorized access
      if (response.status === 401) {
        localStorage.removeItem("token");
        showError("Your session has expired. Please log in again.", "danger");
        setTimeout(() => {
          window.location.href = "/pages/login.html";
        }, 3000);
        return;
      }

      if (response.ok) {
        fetchBooks();
        addBookForm.reset();
        showError("Book added successfully!", "success");
      } else {
        const errorData = await response.json();
        showError(
          errorData.message || "Failed to add book. Please try again.",
          "danger"
        );
      }
    } catch (err) {
      showError("An error occurred. Please try again.", "danger");
    } finally {
      // Re-enable the submit button and reset its text
      submitButton.disabled = false;
      submitButton.innerHTML = "Add Book";
    }
  });

 

  // Render books in the table
  const renderBooks = (books) => {
    bookList.innerHTML = books
      .map(
        (book) => `
        <tr data-id="${book.id}">
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.isbn}</td>
            <td>${book.genre}</td>
            <td>${book.quantity}</td>
            <td>
                <a href="/pages/editBook.html?id=${book.id}" class="btn btn-warning">Edit</a>
                <button class="btn btn-danger" onclick="deleteBook(${book.id})">Delete</button>
            </td>
        </tr>
    `
      )
      .join("");

     
      // Attach event listeners to Edit buttons
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                window.location.href = `/pages/editBook.html?id=${bookId}`;
            });
        });

        // Attach event listeners to Delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                deleteBook(bookId);
            });
        });
};



// edit book
window.editBook = (bookId) => {
    window.location.href = `/pages/editBook.html?id=${bookId}`;
  };

  // Delete book
  window.deleteBook = async (bookId) => {
    if (confirm("Are you sure you want to delete this book?")) {
      try {
        const response = await fetch(`/api/books/${bookId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          fetchBooks(); // Refresh the book list
          showError("Book deleted successfully!", "success");
        } else {
          const errorData = await response.json();
          showError(
            errorData.message || "Failed to delete book. Please try again.",
            "danger"
          );
        }
      } catch (err) {
        console.error("Error deleting book:", err);
        showError("An error occurred. Please try again.", "danger");
      }
    }
  };

  // Fetch and display users
  const fetchUsers = async () => {
    console.log("Fetching users..."); // Debugging line
    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response Status:", response.status); // Debugging line

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch users from the server."
        );
      }

      const result = await response.json();
      console.log("API Response Data:", result); // Debugging line

      if (result.success && result.data) {
        const userList = document.getElementById("userList");
        userList.innerHTML = result.data
          .map(
            (user) => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>
                            <button class="btn btn-warning" onclick="editUser(${user.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                        </td>
                    </tr>
                `
          )
          .join("");
      } else {
        console.error("No data found in API response");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showError("Error fetching users. Please try again.", "danger");
    }
  };
  // Search users
  userSearch.addEventListener("input", function (e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = userList.querySelectorAll("tr");

    rows.forEach((row) => {
      const name = row
        .querySelector("td:nth-child(1)")
        .textContent.toLowerCase();
      const email = row
        .querySelector("td:nth-child(2)")
        .textContent.toLowerCase();
      const role = row
        .querySelector("td:nth-child(3)")
        .textContent.toLowerCase();

      if (
        name.includes(searchTerm) ||
        email.includes(searchTerm) ||
        role.includes(searchTerm)
      ) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });

  // Logout functionality
  document.getElementById("logout").addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("token");
    window.location.href = "../Index.html";
  });

  // Helper function to show errors
  function showError(message, type = "danger") {
    errorMessage.textContent = message;
    errorMessage.className = `alert alert-${type}`;
    errorMessage.style.display = "block";
  }

  // Initial fetch of books
  fetchBooks();

  // Initial fetch of users
  fetchUsers();
});
