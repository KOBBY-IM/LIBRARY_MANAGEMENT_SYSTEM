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
  const notificationList = document.querySelector(".notification-list");
  const errorMessageElement = document.getElementById("error-message");
  const loadingSpinner = document.getElementById("loading");

  // State variables
  let allBooks = [];
  let userLoans = [];
  let notifications = [];
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

      return data;
    } catch (error) {
      showMessage(`Error: ${error.message}`);
      throw error;
    } finally {
      toggleLoading(false);
    }
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

    // Add event listeners to borrow buttons
    document.querySelectorAll(".borrow-btn").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const bookId = this.getAttribute("data-id");
        try {
          this.disabled = true;
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm"></span> Processing...';
          await borrowBook(bookId);
        } catch (error) {
          // Error is already handled in borrowBook
        } finally {
          this.disabled = false;
          this.innerHTML = "Borrow";
        }
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

    // Apply genre filter - fix for genre selection
    if (genre && genre !== "all") {
      filtered = filtered.filter((book) => {
        return book.genre && book.genre.toLowerCase() === genre.toLowerCase();
      });
    }

    // Debug output
    console.log("Genre selected:", genre);
    console.log("Filtered books:", filtered.length);

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

      showMessage(data.message, "success");

      // Refresh data
      await fetchAndDisplayLoans();
      await fetchAndDisplayBooks();

      return data;
    } catch (error) {
      showMessage(`Error: ${error.message}`);
    } finally {
      toggleLoading(false);
    }
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

    // Add event listeners to return buttons
    document.querySelectorAll(".return-btn").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const loanId = this.getAttribute("data-id");
        if (confirm("Are you sure you want to return this book?")) {
          try {
            this.disabled = true;
            this.innerHTML =
              '<span class="spinner-border spinner-border-sm"></span>';
            await returnBook(loanId);
          } catch (error) {
            // Error is already handled in returnBook
          } finally {
            this.disabled = false;
            this.innerHTML = "Return";
          }
        }
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

  // NOTIFICATION FUNCTIONS

  // Fetch user notifications
  async function fetchNotifications() {
    try {
      const response = await fetch(`/api/notifications/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      notifications = data.notifications || [];

      // Update notification badge
      const badge = document.getElementById("notification-badge");
      if (badge) {
        const unreadCount = notifications.filter((n) => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? "inline-block" : "none";
      }

      return notifications;
    } catch (error) {
      showMessage(`Error fetching notifications: ${error.message}`);
      return [];
    }
  }

  // Mark notification as read
  async function markNotificationAsRead(notificationId) {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update local state
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }

      displayNotifications(notifications);

      return true;
    } catch (error) {
      showMessage(`Error: ${error.message}`);
      return false;
    }
  }

  // Display notifications
  function displayNotifications(notifications) {
    if (!notificationList) return;

    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML =
        '<div class="alert alert-info">No notifications</div>';
      return;
    }

    let html = "";
    notifications.forEach((notification) => {
      html += `
                <div class="notification-item ${
                  notification.read ? "" : "unread"
                }" data-id="${notification.id}">
                    <div class="notification-icon">
                        <i class="fas fa-${getNotificationIcon(
                          notification.type
                        )}"></i>
                    </div>
                    <div class="notification-content">
                        <h5>${notification.title}</h5>
                        <p>${notification.message}</p>
                        <span class="notification-time">${formatNotificationTime(
                          notification.createdAt
                        )}</span>
                    </div>
                    <div class="notification-actions">
                        ${
                          !notification.read
                            ? `<button class="btn btn-sm btn-outline-secondary mark-read-btn" data-id="${notification.id}">
                                Mark as Read
                            </button>`
                            : ""
                        }
                    </div>
                </div>
            `;
    });

    notificationList.innerHTML = html;

    // Add event listeners to mark as read buttons
    document.querySelectorAll(".mark-read-btn").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const notificationId = this.getAttribute("data-id");
        try {
          this.disabled = true;
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm"></span>';
          await markNotificationAsRead(notificationId);
        } catch (error) {
          // Error already handled
        }
      });
    });
  }

  // Helper for notification icons
  function getNotificationIcon(type) {
    switch (type) {
      case "due_soon":
        return "exclamation-circle";
      case "overdue":
        return "exclamation-triangle";
      case "reservation":
        return "check-circle";
      case "new_arrivals":
        return "info-circle";
      default:
        return "bell";
    }
  }

  // Format notification time
  function formatNotificationTime(timestamp) {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return `${diffDays} days ago`;
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
      const profileData = await fetchUserProfile();

      if (!profileData.data) {
        return;
      }

      const user = profileData.data;

      // Update welcome message
      if (userWelcome) {
        userWelcome.textContent = user.username || "User";
      }

      // Update profile form if it exists
      const profileForm = document.getElementById("profile-form");
      if (profileForm) {
        // Find form fields
        const usernameField = document.getElementById("username");
        const emailField = document.getElementById("email");
        const fullNameField = document.getElementById("fullName");
        const phoneField = document.getElementById("phone");
        const addressField = document.getElementById("address");

        // Populate form fields
        if (usernameField) usernameField.value = user.username || "";
        if (emailField) emailField.value = user.email || "";
        if (fullNameField) fullNameField.value = user.full_name || "";
        if (phoneField) phoneField.value = user.phone_number || "";
        if (addressField) addressField.value = user.address || "";

        // Set up form submission
        profileForm.addEventListener("submit", async function (e) {
          e.preventDefault();

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
            const email = emailField ? emailField.value : "";
            const fullName = fullNameField ? fullNameField.value : "";
            const phoneNumber = phoneField ? phoneField.value : "";
            const address = addressField ? addressField.value : "";

            const profileData = {
              email,
              fullName,
              phoneNumber,
              address,
            };

            const result = await updateUserProfile(profileData);
            showMessage(
              result.message || "Profile updated successfully!",
              "success"
            );
          } catch (error) {
            showMessage(`Error: ${error.message}`);
          } finally {
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.innerHTML = "Update Profile";
            }
          }
        });
      }
    } catch (error) {
      showMessage(`Error setting up profile: ${error.message}`);
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

  // Fetch and display notifications
  async function fetchAndDisplayNotifications() {
    const notificationsList = await fetchNotifications();
    displayNotifications(notificationsList);
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
        fetchAndDisplayNotifications(),
      ]);

      // Set up user profile
      await setupUserProfile();

      // Set up search and filter
      setupSearchAndFilter();

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
