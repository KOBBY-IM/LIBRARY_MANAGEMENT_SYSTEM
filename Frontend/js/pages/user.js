document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    window.location.href = "/pages/login.html";
    return;
  }

  // DOM Elements
  const userWelcome = document.getElementById("user-name");
  const searchBar = document.getElementById("search-bar");
  const genreFilter = document.getElementById("genre-filter");
  const bookList = document.getElementById("book-list");
  const loanList = document.getElementById("loan-list");
  const messagesList = document.getElementById("messages-list");
  const errorMessageElement = document.getElementById("error-message");
  const loadingSpinner = document.getElementById("loading");

  // State variables
  let allBooks = [];
  let userLoans = [];
  let messages = [];
  let penaltyInfo = {};

  // Helper function to show error messages
  function showMessage(
    message,
    type = "danger",
    element = errorMessageElement
  ) {
    if (!element) return;

    element.innerHTML = message;
    element.className = `alert alert-${type}`;
    element.style.display = "block";

    if (type === "success") {
      setTimeout(() => {
        element.style.display = "none";
      }, 3000);
    }
  }

  // Loading indicator function
  function toggleLoading(show) {
    if (loadingSpinner) {
      loadingSpinner.style.display = show ? "block" : "none";
    }
  }

  // Navigation between tabs
  function setupNavigation() {
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    const contentSections = document.querySelectorAll(".content-section");

    sidebarLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        // Get the target section ID
        const targetId = this.getAttribute("href").substring(1);
        const targetSection = document.getElementById(targetId);

        if (!targetSection) {
          console.warn(`Section with ID ${targetId} not found`);
          return;
        }

        // Update active class on sidebar links
        sidebarLinks.forEach((link) => link.classList.remove("active"));
        this.classList.add("active");

        // Show the target section, hide others
        contentSections.forEach((section) => {
          section.classList.remove("active");
        });
        targetSection.classList.add("active");

        // Load specific content for some sections
        if (targetId === "penalty-history") {
          loadPenaltyHistory();
        } else if (targetId === "messages") {
          // Refresh messages when tab is clicked
          fetchAndDisplayMessages();
        }
      });
    });
  }

  // BOOK FUNCTIONS

  // Fetch all books
  async function fetchBooks() {
    try {
      toggleLoading(true);

      const response = await fetch("/api/books", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }

      const data = await response.json();
      allBooks = data.data || [];

      return allBooks;
    } catch (error) {
      showMessage(`Error fetching books: ${error.message}`);
      return [];
    } finally {
      toggleLoading(false);
    }
  }

  // Borrow a book
  async function borrowBook(bookId) {
    try {
      toggleLoading(true);

      const response = await fetch("/api/loans/borrow", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          bookId: bookId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to borrow book");
      }

      showMessage(data.message, "success");

      // Refresh data
      await fetchAndDisplayBooks();
      await fetchAndDisplayLoans();
      await fetchAndDisplayMessages();

      return data;
    } catch (error) {
      showMessage(`Error: ${error.message}`, "danger");
      throw error;
    } finally {
      toggleLoading(false);
    }
  }

  // Handler for borrowing books
  function handleBorrowBook(bookId) {
    borrowBook(bookId);
  }

  // Display books
  function displayBooks(books) {
    if (!bookList) return;

    if (!books || books.length === 0) {
      bookList.innerHTML =
        '<div class="alert alert-info w-100">No books found matching your criteria.</div>';
      return;
    }

    // Group books by genre
    const booksByGenre = {};
    books.forEach((book) => {
      const genre = book.genre || "Uncategorized";
      if (!booksByGenre[genre]) {
        booksByGenre[genre] = [];
      }
      booksByGenre[genre].push(book);
    });

    let html = "";

    // Generate HTML for each genre section
    Object.keys(booksByGenre)
      .sort()
      .forEach((genre) => {
        html += `
                <div class="genre-section">
                    <h3>${genre}</h3>
                    <div class="books-container">
            `;

        // Add books in this genre
        booksByGenre[genre].forEach((book) => {
          html += `
                    <div class="book-card">
                        <div class="book-cover">
                            <img src="${
                              book.cover_image_url || "../images/no-cover.png"
                            }" 
                                 alt="${book.title}" 
                                 class="img-fluid mb-2"
                                 onerror="this.src='../images/no-cover.png';">
                        </div>
                        <div class="book-info">
                            <h5>${book.title}</h5>
                            <p><strong>Author:</strong> ${book.author}</p>
                            <p><strong>ISBN:</strong> ${book.isbn || "N/A"}</p>
                            <p><strong>Available:</strong> ${book.quantity}</p>
                        </div>
                        <button class="btn btn-primary borrow-btn" 
                                data-id="${book.id}" 
                                ${book.quantity <= 0 ? "disabled" : ""}>
                            ${book.quantity <= 0 ? "Out of Stock" : "Borrow"}
                        </button>
                    </div>
                `;
        });

        html += `
                    </div>
                </div>
            `;
      });

    bookList.innerHTML = html;

    // Add event listeners to borrow buttons - WITHOUT confirmation dialog
    document.querySelectorAll(".borrow-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const bookId = this.getAttribute("data-id");

        // Show processing state
        this.disabled = true;
        this.innerHTML =
          '<span class="spinner-border spinner-border-sm"></span> Processing...';

        // Call borrow function directly without confirmation
        borrowBook(bookId)
          .catch(() => {
            // Error is already handled in borrowBook
          })
          .finally(() => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = "Borrow";
          });
      });
    });
  }

  // Filter books based on search and genre
  function filterBooks() {
    if (!searchBar || !genreFilter || !allBooks) return;

    const searchTerm = searchBar.value.toLowerCase().trim();
    const genre = genreFilter.value;

    let filtered = [...allBooks];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (book) =>
          (book.title && book.title.toLowerCase().includes(searchTerm)) ||
          (book.author && book.author.toLowerCase().includes(searchTerm)) ||
          (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
      );
    }

    // Apply genre filter
    if (genre && genre !== "all") {
      filtered = filtered.filter((book) => {
        return book.genre && book.genre.toLowerCase() === genre.toLowerCase();
      });
    }

    displayBooks(filtered);
  }

  // Setup search and filter functionality
  function setupSearchAndFilter() {
    if (searchBar) {
      searchBar.addEventListener("input", filterBooks);
    }

    if (genreFilter) {
      genreFilter.addEventListener("change", filterBooks);
    }
  }

  // Populate genre filter dropdown
  function populateGenreFilter() {
    if (!genreFilter || !allBooks || !allBooks.length) return;

    // Get unique genres
    const genres = [
      ...new Set(
        allBooks.filter((book) => book.genre).map((book) => book.genre)
      ),
    ].sort();

    let optionsHTML = '<option value="all">All Genres</option>';
    genres.forEach((genre) => {
      optionsHTML += `<option value="${genre}">${genre}</option>`;
    });

    genreFilter.innerHTML = optionsHTML;
  }

  // LOAN FUNCTIONS

  // Fetch user loans
  async function fetchLoans() {
    try {
      const response = await fetch(`/api/loans/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }

      const data = await response.json();
      userLoans = data.data || [];
      penaltyInfo = data.penaltyInfo || {};

      return data;
    } catch (error) {
      showMessage(`Error fetching loans: ${error.message}`);
      return { data: [], penaltyInfo: {} };
    }
  }

  // Return a book
  async function returnBook(loanId) {
    try {
      toggleLoading(true);

      const response = await fetch(`/api/loans/return/${loanId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to return book");
      }

      showMessage(data.message || "Book returned successfully", "success");

      // Refresh data
      await fetchAndDisplayLoans();
      await fetchAndDisplayBooks();
      await fetchAndDisplayMessages();

      return data;
    } catch (error) {
      showMessage(`Error: ${error.message}`, "danger");
    } finally {
      toggleLoading(false);
    }
  }

  // Handler for returning books
  function handleReturnBook(loanId) {
    returnBook(loanId);
  }

  // Display loans and penalty info
  function displayLoans(loans, penaltyInfo) {
    // Display penalty info
    updatePenaltyInfo(penaltyInfo);

    // Update stat cards
    updateLoanStats(loans);

    // Display loans
    if (!loanList) return;

    if (!loans || loans.length === 0) {
      loanList.innerHTML =
        '<tr><td colspan="6" class="text-center">No active loans</td></tr>';
      return;
    }

    let html = "";
    loans.forEach((loan) => {
      html += `
                <tr ${
                  loan.is_overdue
                    ? 'class="table-danger"'
                    : loan.days_remaining <= 2
                    ? 'class="table-warning"'
                    : ""
                }>
                    <td>${loan.title}</td>
                    <td>${loan.author}</td>
                    <td>${new Date(loan.borrow_date).toLocaleDateString()}</td>
                    <td>${new Date(loan.due_date).toLocaleDateString()}</td>
                    <td>
                        ${
                          loan.is_overdue
                            ? `<span class="badge bg-danger">Overdue by ${Math.abs(
                                loan.days_remaining
                              )} day(s)</span>`
                            : loan.days_remaining <= 2
                            ? `<span class="badge bg-warning">Due soon (${loan.days_remaining} day(s))</span>`
                            : `<span class="badge bg-success">${loan.days_remaining} day(s) left</span>`
                        }
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger return-btn" data-id="${
                          loan.id
                        }">Return</button>
                    </td>
                </tr>
            `;
    });

    loanList.innerHTML = html;

    // Add event listeners to return buttons - WITHOUT confirmation dialog
    document.querySelectorAll(".return-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const loanId = this.getAttribute("data-id");

        // Show processing state
        this.disabled = true;
        this.innerHTML =
          '<span class="spinner-border spinner-border-sm"></span>';

        // Call return function directly without confirmation
        returnBook(loanId).finally(() => {
          // Reset button state
          this.disabled = false;
          this.innerHTML = "Return";
        });
      });
    });
  }

  // Update loan statistics
  function updateLoanStats(loans) {
    const totalLoansElement = document.getElementById("total-loans");
    const activeLoansElement = document.getElementById("active-loans");
    const overdueLoansElement = document.getElementById("overdue-loans");

    if (!loans) return;

    if (totalLoansElement) {
      totalLoansElement.textContent = loans.length;
    }

    if (activeLoansElement) {
      activeLoansElement.textContent = loans.length;
    }

    if (overdueLoansElement) {
      const overdueCount = loans.filter((loan) => loan.is_overdue).length;
      overdueLoansElement.textContent = overdueCount;
    }
  }

  // Update penalty info display
  function updatePenaltyInfo(penaltyInfo) {
    if (!penaltyInfo) return;

    const penaltyStatusElement = document.getElementById("penalty-status");
    const borrowLimitElement = document.getElementById("borrow-limit");

    if (penaltyStatusElement) {
      penaltyStatusElement.innerHTML = `
                <div class="penalty-status">
                    <h6>Borrowing Status for ${
                      penaltyInfo.currentQuarter || "Current Quarter"
                    }</h6>
                    <p>Penalty Level: 
                        <span class="badge ${
                          penaltyInfo.penaltyLevel === "None"
                            ? "bg-success"
                            : penaltyInfo.penaltyLevel === "Mild"
                            ? "bg-info"
                            : penaltyInfo.penaltyLevel === "Moderate"
                            ? "bg-warning"
                            : "bg-danger"
                        }">
                            ${penaltyInfo.penaltyLevel || "None"}
                        </span>
                    </p>
                    <p>Overdue Books: ${penaltyInfo.overdueBooks || 0}</p>
                    <p>Penalty Points: ${
                      penaltyInfo.quarterlyPenaltyPoints || 0
                    }</p>
                </div>
            `;
    }

    if (borrowLimitElement) {
      const currentLoans = penaltyInfo.currentLoans || 0;
      const maxLoans = penaltyInfo.maxLoansAllowed || 10;
      const percentage = Math.min(100, (currentLoans / maxLoans) * 100);

      borrowLimitElement.innerHTML = `
                <div class="borrow-limit-info">
                    <h6>Borrowing Limits</h6>
                    <p>Current Loans: ${currentLoans} of ${maxLoans}</p>
                    <div class="progress mb-2">
                        <div class="progress-bar ${
                          percentage >= 90
                            ? "bg-danger"
                            : percentage >= 70
                            ? "bg-warning"
                            : "bg-success"
                        }" 
                            style="width: ${percentage}%" 
                            aria-valuenow="${currentLoans}" 
                            aria-valuemin="0" 
                            aria-valuemax="${maxLoans}">
                        </div>
                    </div>
                    <p>Status: ${
                      penaltyInfo.borrowingStatus || "Can Borrow"
                    }</p>
                </div>
            `;
    }
  }

  // === IMPROVED MESSAGE FUNCTIONS ===

// COMPLETE MESSAGE HANDLING FIX

// Fetch user messages with updated badge count
async function fetchMessages() {
  try {
    const response = await fetch(`/api/messages/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }

    const data = await response.json();
    messages = data.messages || [];

    // Debug log to see message IDs and types
    console.log("Fetched messages:", messages.map(m => ({id: m.id, type: typeof m.id})));

    // Update badge count once after fetching
    updateUnreadBadge();

    return messages;
  } catch (error) {
    console.error(`Error fetching messages:`, error);
    showMessage(`Error fetching messages: ${error.message}`);
    return [];
  }
}

// Simple function to accurately count unread messages
function countUnreadMessages() {
  return messages.filter(m => !m.read).length;
}

// Simplified badge update that uses direct count
function updateUnreadBadge() {
  const unreadCount = countUnreadMessages();
  
  // Get all badge elements
  const badges = [
    document.getElementById("message-badge"),
    ...document.querySelectorAll('.sidebar-link[href="#messages"] .badge')
  ];

  // Update all badges with the same count
  badges.forEach(badge => {
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "inline-block" : "none";
    }
  });
  
  console.log(`Badge updated: ${unreadCount} unread messages`);
}

// Helper function to safely compare IDs (handles string/number type differences)
function isSameId(id1, id2) {
  // If direct comparison works, use it
  if (id1 === id2) return true;
  
  // Try string comparison
  return String(id1) === String(id2);
}

// Mark a message as read - Fixed with robust ID handling
async function markMessageAsRead(messageId) {
  try {
    console.log(`Marking message as read: ${messageId}`);
    console.log("Message ID type:", typeof messageId);
    console.log("All message IDs:", messages.map(m => ({id: m.id, type: typeof m.id})));

    // Find the message using our safe comparison
    const messageIndex = messages.findIndex(m => isSameId(m.id, messageId));
    
    if (messageIndex === -1) {
      console.warn(`Message ID ${messageId} not found in local state`);
      
      // Still try to mark as read on server anyway
      try {
        await fetch(`/api/messages/${messageId}/read`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (apiError) {
        console.error("API error marking as read:", apiError);
      }
      
      // Refresh messages to ensure we have the latest state
      await fetchAndDisplayMessages();
      return false;
    }
    
    // Update local state immediately
    const wasUnread = !messages[messageIndex].read;
    messages[messageIndex].read = true;
    
    // Only update the badge if the message was previously unread
    if (wasUnread) {
      updateUnreadBadge();
    }
    
    // Re-render messages list with updated state
    displayMessages(messages);

    // Make API call in the background
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`API call to mark message as read failed with status: ${response.status}`);
      } else {
        console.log("Successfully marked message as read on server");
      }
    } catch (apiError) {
      console.error("API error marking message as read:", apiError);
      // We don't revert UI changes even on API error
    }

    return true;
  } catch (error) {
    console.error("Error in markMessageAsRead:", error);
    return false;
  }
}

// Delete a message - Fixed with robust ID handling
async function deleteMessage(messageId) {
  try {
    console.log(`Deleting message ID: ${messageId}`, typeof messageId);
    console.log("All message IDs:", messages.map(m => ({id: m.id, type: typeof m.id})));
    
    // Find the message using our safe comparison
    const messageToDelete = messages.find(m => isSameId(m.id, messageId));
    
    if (!messageToDelete) {
      console.warn(`Message ID ${messageId} not found for deletion`);
      
      // Even if we can't find the message, still try to delete on server
      try {
        await fetch(`/api/messages/${messageId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (apiError) {
        console.error("API error deleting message:", apiError);
      }
      
      // Refresh messages to ensure we have the latest state
      await fetchAndDisplayMessages();
      return true;
    }
    
    // Keep track of whether this will affect unread count
    const wasUnread = !messageToDelete.read;
    
    // Optimistically update local state (using our safe comparison)
    messages = messages.filter(m => !isSameId(m.id, messageId));
    
    // Update UI first
    displayMessages(messages);
    
    // Update badge count if needed
    if (wasUnread) {
      updateUnreadBadge();
    }
    
    // Then make API call
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`Server returned ${response.status} when deleting message ${messageId}`);
        // Don't throw - we want to keep the UI updated regardless
      }
      
      return true;
    } catch (apiError) {
      console.error("API error deleting message:", apiError);
      // Don't show error to user since the UI already updated
      return true; // Still consider this a success from the user's perspective
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return false;
  }
}

// Display messages
function displayMessages(messagesToShow) {
  if (!messagesList) return;

  if (!messagesToShow || messagesToShow.length === 0) {
    messagesList.innerHTML = '<div class="alert alert-info">You have no messages</div>';
    return;
  }

  // Create a new instance of MessageList and render it
  const messageList = new MessageList(
    "messages-list",
    messagesToShow,
    handleDeleteMessage,
    handleMarkAsRead
  );
  messageList.render();
}

// Handler for deleting messages
function handleDeleteMessage(messageId) {
  console.log(`Handler received delete request for message ID: ${messageId}`);
  deleteMessage(messageId);
}

// Handler function that calls markMessageAsRead
function handleMarkAsRead(messageId) {
  console.log(`Handler received mark-as-read request for message ID: ${messageId}`);
  markMessageAsRead(messageId);
}

  // Setup message search functionality
  function setupMessageSearch() {
    const messageSearchInput = document.getElementById("message-search");
    if (messageSearchInput) {
      messageSearchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase().trim();

        if (searchTerm === "") {
          // If search is empty, show all messages
          displayMessages(messages);
          return;
        }

        // Filter messages based on search term
        const filteredMessages = messages.filter(
          (message) =>
            (message.title &&
              message.title.toLowerCase().includes(searchTerm)) ||
            (message.message &&
              message.message.toLowerCase().includes(searchTerm))
        );

        // Display filtered messages
        displayMessages(filteredMessages);
      });
    }
  }

  // USER PROFILE FUNCTIONS

  // Fetch user profile
  async function fetchUserProfile() {
    try {
      const response = await fetch("/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      return await response.json();
    } catch (error) {
      showMessage(`Error fetching user profile: ${error.message}`);
      return { data: null };
    }
  }

  // Update user profile
  async function updateUserProfile(profileData) {
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Display and set up user profile
  async function setupUserProfile() {
    try {
      // Fetch user profile data
      const profileData = await fetchUserProfile();

      if (!profileData.data) {
        showMessage("Failed to load user profile data", "danger");
        return;
      }

      const user = profileData.data;

      // Update welcome message
      if (userWelcome) {
        userWelcome.textContent = user.username || "User";
      }

      // Update profile form if it exists
      const profileForm = document.getElementById("profile-form");
      const profileFeedback = document.getElementById("profile-feedback");

      if (profileForm) {
        // Find form fields
        const usernameField = document.getElementById("username");
        const emailField = document.getElementById("email");
        const fullNameField = document.getElementById("fullName");
        const phoneField = document.getElementById("phone");
        const addressField = document.getElementById("address");
        const passwordField = document.getElementById("password");
        const confirmPasswordField = document.getElementById("confirmPassword");

        // Populate form fields
        if (usernameField) {
          usernameField.value = user.username || "";
          // Username is typically not changeable after account creation
          usernameField.disabled = true;
        }

        if (emailField) emailField.value = user.email || "";
        if (fullNameField) fullNameField.value = user.full_name || "";
        if (phoneField) phoneField.value = user.phone_number || "";
        if (addressField) addressField.value = user.address || "";

        // Password fields are left empty as they are for changing password

        // Set up form validation
        if (emailField) {
          emailField.addEventListener("blur", function () {
            validateEmail(this);
          });
        }

        if (passwordField && confirmPasswordField) {
          passwordField.addEventListener("blur", function () {
            validatePassword(this);
          });

          confirmPasswordField.addEventListener("blur", function () {
            validateConfirmPassword(passwordField, this);
          });
        }

        // Set up form submission
        profileForm.addEventListener("submit", async function (e) {
          e.preventDefault();

          // Validate form
          let isValid = true;

          if (emailField && !validateEmail(emailField)) {
            isValid = false;
          }

          // Only validate password fields if the user is trying to change password
          if (passwordField && passwordField.value) {
            if (!validatePassword(passwordField)) {
              isValid = false;
            }

            if (
              confirmPasswordField &&
              !validateConfirmPassword(passwordField, confirmPasswordField)
            ) {
              isValid = false;
            }
          }

          if (!isValid) {
            showMessage("Please correct the errors in the form", "danger");
            return;
          }

          const submitButton = document.querySelector(
            '#profile-form button[type="submit"]'
          );
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML =
              '<span class="spinner-border spinner-border-sm"></span> Updating...';
          }

          try {
            // Get form values
            const email = emailField ? emailField.value.trim() : "";
            const fullName = fullNameField ? fullNameField.value.trim() : "";
            const phoneNumber = phoneField ? phoneField.value.trim() : "";
            const address = addressField ? addressField.value.trim() : "";
            const password =
              passwordField && passwordField.value
                ? passwordField.value
                : undefined;

            const profileData = {
              email,
              fullName,
              phoneNumber,
              address,
            };

            // Only include password if it's being changed
            if (password) {
              profileData.password = password;
            }

            const result = await updateUserProfile(profileData);

            // Show success message
            if (profileFeedback) {
              profileFeedback.className = "alert alert-success";
              profileFeedback.textContent =
                result.message || "Profile updated successfully!";
              profileFeedback.style.display = "block";

              // Reset password fields
              if (passwordField) passwordField.value = "";
              if (confirmPasswordField) confirmPasswordField.value = "";

              // Hide success message after 3 seconds
              setTimeout(() => {
                profileFeedback.style.display = "none";
              }, 3000);
            } else {
              showMessage(
                result.message || "Profile updated successfully!",
                "success"
              );
            }
          } catch (error) {
            if (profileFeedback) {
              profileFeedback.className = "alert alert-danger";
              profileFeedback.textContent =
                error.message || "Failed to update profile";
              profileFeedback.style.display = "block";
            } else {
              showMessage(`Error: ${error.message}`, "danger");
            }
          } finally {
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.innerHTML = "Update Profile";
            }
          }
        });
      }
    } catch (error) {
      showMessage(`Error setting up profile: ${error.message}`, "danger");
    }
  }

  // Form validation functions
  function validateEmail(emailField) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(emailField.value.trim());

    toggleValidationFeedback(
      emailField,
      isValid,
      "Please enter a valid email address"
    );
    return isValid;
  }

  function validatePassword(passwordField) {
    const isValid = passwordField.value.length >= 6;

    toggleValidationFeedback(
      passwordField,
      isValid,
      "Password must be at least 6 characters long"
    );
    return isValid;
  }

  function validateConfirmPassword(passwordField, confirmField) {
    const isValid = confirmField.value === passwordField.value;

    toggleValidationFeedback(confirmField, isValid, "Passwords do not match");
    return isValid;
  }

  function toggleValidationFeedback(field, isValid, errorMessage) {
    const feedbackElement = field.nextElementSibling;

    if (
      !feedbackElement ||
      !feedbackElement.classList.contains("invalid-feedback")
    ) {
      // Create feedback element if it doesn't exist
      const newFeedback = document.createElement("div");
      newFeedback.className = "invalid-feedback";
      newFeedback.textContent = errorMessage;
      field.parentNode.insertBefore(newFeedback, field.nextSibling);

      // Add validation classes
      if (isValid) {
        field.classList.remove("is-invalid");
        field.classList.add("is-valid");
      } else {
        field.classList.remove("is-valid");
        field.classList.add("is-invalid");
      }
      return;
    }

    // Update existing feedback element
    feedbackElement.textContent = errorMessage;

    // Update validation classes
    if (isValid) {
      field.classList.remove("is-invalid");
      field.classList.add("is-valid");
      feedbackElement.style.display = "none";
    } else {
      field.classList.remove("is-valid");
      field.classList.add("is-invalid");
      feedbackElement.style.display = "block";
    }
  }

  // PENALTY HISTORY FUNCTIONS

  // Fetch penalty history
  async function fetchPenaltyHistory() {
    try {
      const response = await fetch(`/api/loans/penalties/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch penalty history");
      }

      return await response.json();
    } catch (error) {
      showMessage(`Error fetching penalty history: ${error.message}`);
      return { data: [], quarterlyBreakdown: {} };
    }
  }
  // Load and display penalty history
  async function loadPenaltyHistory() {
    const penaltyHistoryContainer = document.getElementById(
      "penalty-history-container"
    );
    if (!penaltyHistoryContainer) return;

    try {
      toggleLoading(true);

      const historyData = await fetchPenaltyHistory();

      if (!historyData.data || historyData.data.length === 0) {
        penaltyHistoryContainer.innerHTML =
          '<div class="alert alert-info">You have no penalty history.</div>';
        return;
      }

      // Create quarterly summary
      let quarterlyHTML = `
              <h4>Quarterly Summary</h4>
              <div class="table-responsive mb-4">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Quarter</th>
                              <th>Total Points</th>
                              <th>Number of Penalties</th>
                          </tr>
                      </thead>
                      <tbody>
          `;

      for (const [quarter, data] of Object.entries(
        historyData.quarterlyBreakdown
      )) {
        quarterlyHTML += `
                  <tr>
                      <td>${quarter}</td>
                      <td>${data.totalPoints}</td>
                      <td>${data.penaltyCount}</td>
                  </tr>
              `;
      }

      quarterlyHTML += `
                      </tbody>
                  </table>
              </div>
          `;

      // Create detailed history
      let detailHTML = `
              <h4>Detailed Penalty History</h4>
              <div class="table-responsive">
                  <table class="table table-striped">
                      <thead>
                          <tr>
                              <th>Date</th>
                              <th>Book</th>
                              <th>Days Overdue</th>
                              <th>Points</th>
                              <th>Quarter</th>
                              <th>Level</th>
                          </tr>
                      </thead>
                      <tbody>
          `;

      historyData.data.forEach((penalty) => {
        detailHTML += `
                  <tr>
                      <td>${new Date(
                        penalty.penalty_date
                      ).toLocaleDateString()}</td>
                      <td>${penalty.title}</td>
                      <td>${penalty.overdue_days}</td>
                      <td>${penalty.penalty_points}</td>
                      <td>${penalty.quarter || "N/A"}</td>
                      <td>
                          <span class="badge ${
                            penalty.penalty_level === "Severe"
                              ? "bg-danger"
                              : penalty.penalty_level === "Moderate"
                              ? "bg-warning"
                              : "bg-info"
                          }">
                              ${penalty.penalty_level}
                          </span>
                      </td>
                  </tr>
              `;
      });

      detailHTML += `
                      </tbody>
                  </table>
              </div>
          `;

      penaltyHistoryContainer.innerHTML = quarterlyHTML + detailHTML;

      // Update total penalty points
      const totalPenaltyPointsElement = document.getElementById(
        "total-penalty-points"
      );
      if (
        totalPenaltyPointsElement &&
        historyData.currentQuarterPenaltyPoints !== undefined
      ) {
        totalPenaltyPointsElement.textContent =
          historyData.currentQuarterPenaltyPoints;
      }
    } catch (error) {
      penaltyHistoryContainer.innerHTML = `<div class="alert alert-danger">Error loading penalty history: ${error.message}</div>`;
    } finally {
      toggleLoading(false);
    }
  }

  // COMBINED FUNCTIONS AND INITIALIZATION

  // Fetch and display books
  async function fetchAndDisplayBooks() {
    await fetchBooks();
    displayBooks(allBooks);
    populateGenreFilter();
  }

  // Fetch and display loans
  async function fetchAndDisplayLoans() {
    const loansData = await fetchLoans();
    displayLoans(loansData.data, loansData.penaltyInfo);
  }

  // Fetch and display messages
  async function fetchAndDisplayMessages() {
    const messagesList = await fetchMessages();
    displayMessages(messagesList);
  }

  // Set up logout functionality
  function setupLogout() {
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        window.location.href = "/index.html";
      });
    }
  }

  // Initialize everything
  async function initialize() {
    try {
      toggleLoading(true);

      // Set up navigation
      setupNavigation();

      // Load initial data
      await Promise.all([
        fetchAndDisplayBooks(),
        fetchAndDisplayLoans(),
        fetchAndDisplayMessages(),
      ]);

      // Set up user profile
      await setupUserProfile();

      // Set up search and filter
      setupSearchAndFilter();

      // Set up message search functionality
      setupMessageSearch();

      // Set up logout
      setupLogout();

      // Show the search-books section by default instead of dashboard
      const defaultSection = document.getElementById("search-books");
      const defaultLink = document.querySelector(
        '.sidebar-link[href="#search-books"]'
      );

      if (defaultSection) {
        defaultSection.classList.add("active");
      }

      if (defaultLink) {
        defaultLink.classList.add("active");
      }
    } catch (error) {
      showMessage(`Error initializing page: ${error.message}`);
    } finally {
      toggleLoading(false);
    }
  }

  // Start the application
  initialize();
});
