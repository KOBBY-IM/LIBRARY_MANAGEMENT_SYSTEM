document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/pages/login.html";
    return;
  }

  const searchBar = document.getElementById("search-bar");
  const genreFilter = document.getElementById("genre-filter");
  const bookList = document.getElementById("book-list");
  const loanList = document.getElementById("loan-list");
  const errorMessage = document.getElementById("error-message");
  const penaltyStatusElement = document.getElementById("penalty-status");
  const borrowLimitElement = document.getElementById("borrow-limit");
  // Keep track of all books for filtering
  let allBooks = [];
  let availableGenres = new Set();

  // Function to show error or success messages
  const showError = (message, type = "danger") => {
    errorMessage.textContent = message;
    errorMessage.className = `alert alert-${type}`;
    errorMessage.style.display = "block";

    // Hide the message after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 5000);
  };

  // Search functionality
  searchBar.addEventListener("input", function () {
    const searchTerm = this.value.trim();
    if (searchTerm.length >= 2) {
      // Show loading indicator
      document.getElementById("loading").style.display = "block";
      fetchBooks(searchTerm);
    } else if (searchTerm.length === 0) {
      fetchBooks();
    }
  });

  // Populate genre filter with available genres
  const populateGenreFilter = (books) => {
    // Extract unique genres
    books.forEach((book) => {
      if (book.genre) {
        availableGenres.add(book.genre);
      }
    });

    // Keep the "All Genres" option
    const currentValue = genreFilter.value;
    genreFilter.innerHTML = '<option value="">All Genres</option>';

    // Add genre options
    [...availableGenres].sort().forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    });

    // Restore the previous selection if possible
    if (currentValue) {
      genreFilter.value = currentValue;
    }
  };

  // Fetch books
  const fetchBooks = async (searchTerm = "") => {
    try {
      let url = "/api/books";
      if (searchTerm) {
        url = `/api/books/search?searchTerm=${encodeURIComponent(searchTerm)}`;
      }

      document.getElementById("loading").style.display = "block";

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }

      const data = await response.json();

      // Store all books for filtering
      allBooks = data.data || [];

      // Populate genre filter with available genres
      populateGenreFilter(allBooks);

      // Check if no books were found
      if (allBooks.length === 0 && searchTerm) {
        bookList.innerHTML = `<div class="alert alert-info">No books found matching "${searchTerm}". Try a different search term.</div>`;
      } else {
        // Apply any active genre filter
        filterBooks();
      }
    } catch (err) {
      showError("Failed to fetch books. Please try again.");
      console.error("Fetch books error:", err);
    } finally {
      document.getElementById("loading").style.display = "none";
    }
  };

  // Filter books by genre
  const filterBooks = () => {
    const selectedGenre = genreFilter.value;

    let filteredBooks = allBooks;

    // Apply genre filter if a genre is selected
    if (selectedGenre) {
      filteredBooks = allBooks.filter((book) => book.genre === selectedGenre);

      // Show a message if no books match the filter
      if (filteredBooks.length === 0) {
        bookList.innerHTML = `<div class="alert alert-info">No books found in the "${selectedGenre}" genre.</div>`;
        return;
      }
    }

    // Render filtered books
    renderBooks(filteredBooks);
  };

  // Render books
  const renderBooks = (books) => {
    bookList.innerHTML = books
      .map(
        (book) => `
            <div class="book-card">
                <h5>${book.title}</h5>
                <p>Author: ${book.author}</p>
                <p>Genre: ${book.genre}</p>
                <p>Available: ${book.quantity}</p>
                <button class="btn btn-primary borrow-btn" data-id="${
                  book.id
                }" ${book.quantity <= 0 ? "disabled" : ""}>
                    ${book.quantity <= 0 ? "Out of Stock" : "Borrow"}
                </button>
            </div>
        `
      )
      .join("");

    // Add event listeners to borrow buttons
    document.querySelectorAll(".borrow-btn").forEach((button) => {
      if (!button.hasAttribute("disabled")) {
        button.addEventListener("click", handleBorrowBook);
      }
    });
  };

  // Handle borrowing a book
  const handleBorrowBook = async (e) => {
    e.preventDefault();
    const bookId = e.target.dataset.id;
    const userId = localStorage.getItem("userId");

    console.log("Attempting to borrow book:", { userId, bookId });

    if (!userId) {
      showError("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch("/api/loans/borrow", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, bookId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to borrow book");
      }

      showError(data.message || "Book borrowed successfully!", "success");
      fetchBooks(); // Refresh the book list
      fetchLoans(); // Refresh the loans list
    } catch (err) {
      showError(err.message || "Failed to borrow book. Please try again.");
      console.error("Borrow book error:", err);
    }
  };

  // Fetch and display loans
  const fetchLoans = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      showError("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`/api/loans/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }

      const data = await response.json();
      renderLoans(data.data || []);

      // Update loan stats and penalty info
      updateLoanStats(data.data || [], data.penaltyInfo);
    } catch (err) {
      showError("Failed to fetch loans. Please try again.");
      console.error("Fetch loans error:", err);
    }
  };

  // Update loan statistics and penalty information
  const updateLoanStats = (loans, penaltyInfo) => {
    const totalLoansElement = document.getElementById("total-loans");
    const activeLoansElement = document.getElementById("active-loans");
    const overdueLoansElement = document.getElementById("overdue-loans");

    if (totalLoansElement) totalLoansElement.textContent = loans.length;
    if (activeLoansElement) activeLoansElement.textContent = loans.length;

    // Calculate overdue books
    const overdue = loans.filter((loan) => loan.is_overdue).length;
    if (overdueLoansElement) overdueLoansElement.textContent = overdue;

    // Update penalty status if the elements exist and penalty info is available
    if (penaltyInfo) {
      if (penaltyStatusElement) {
        let statusClass = "bg-success";
        if (penaltyInfo.penaltyLevel === "Severe") {
          statusClass = "bg-danger";
        } else if (penaltyInfo.penaltyLevel === "Moderate") {
          statusClass = "bg-warning";
        } else if (penaltyInfo.penaltyLevel === "Mild") {
          statusClass = "bg-info";
        }

        penaltyStatusElement.innerHTML = `
                    <div class="penalty-status ${statusClass}">
                        <h6>Penalty Status: ${penaltyInfo.penaltyLevel}</h6>
                        <p>${penaltyInfo.overdueBooks} overdue book(s)</p>
                    </div>
                `;
      }

      if (borrowLimitElement) {
        borrowLimitElement.innerHTML = `
                    <div class="borrow-limit-info">
                        <h6>Borrowing Limit: ${penaltyInfo.currentLoans}/${
          penaltyInfo.maxLoansAllowed
        }</h6>
                        <div class="progress">
                            <div class="progress-bar ${
                              penaltyInfo.borrowingStatus === "Limit Reached"
                                ? "bg-danger"
                                : "bg-success"
                            }" 
                                 role="progressbar" 
                                 style="width: ${
                                   (penaltyInfo.currentLoans /
                                     penaltyInfo.maxLoansAllowed) *
                                   100
                                 }%" 
                                 aria-valuenow="${penaltyInfo.currentLoans}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="${penaltyInfo.maxLoansAllowed}">
                            </div>
                        </div>
                    </div>
                `;
      }
    }
  };

  // Render loans
  const renderLoans = (loans) => {
    if (!loanList) return;

    if (loans.length === 0) {
      loanList.innerHTML =
        '<tr><td colspan="6" class="text-center">No books borrowed yet</td></tr>';
      return;
    }

    loanList.innerHTML = loans
      .map((loan) => {
        const isOverdue = loan.is_overdue;
        const daysRemaining = loan.days_remaining;

        let statusBadge;
        if (isOverdue) {
          statusBadge = `<span class="badge bg-danger">Overdue by ${Math.abs(
            daysRemaining
          )} day(s)</span>`;
        } else if (daysRemaining <= 2) {
          statusBadge = `<span class="badge bg-warning">Due soon (${daysRemaining} day(s))</span>`;
        } else {
          statusBadge = `<span class="badge bg-success">${daysRemaining} day(s) left</span>`;
        }

        return `
            <tr ${
              isOverdue
                ? 'class="table-danger"'
                : daysRemaining <= 2
                ? 'class="table-warning"'
                : ""
            }>
                <td>${loan.title}</td>
                <td>${loan.author}</td>
                <td>${new Date(loan.borrow_date).toLocaleDateString()}</td>
                <td>${new Date(loan.due_date).toLocaleDateString()}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-danger return-btn" data-id="${
                      loan.id
                    }">Return</button>
                </td>
            </tr>
            `;
      })
      .join("");

    // Add event listeners to return buttons
    document.querySelectorAll(".return-btn").forEach((button) => {
      button.addEventListener("click", handleReturnBook);
    });
  };

  // Handle returning a book
  const handleReturnBook = async (e) => {
    const loanId = e.target.dataset.id;

    try {
      const response = await fetch(`/api/loans/return/${loanId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to return book");
      }

      showError(data.message || "Book returned successfully!", "success");

      // If the book was overdue, display a warning about penalties
      if (data.wasOverdue) {
        showError(
          `Note: This book was ${data.overdueDays} day(s) overdue. ${data.penaltyPoints} penalty points added to your account.`,
          "warning"
        );
      }

      fetchLoans(); // Refresh loans
      fetchBooks(); // Refresh book list to show updated quantities
      fetchPenaltyHistory(); // Fetch penalty history to update the total points
    } catch (err) {
      showError(err.message || "Failed to return book. Please try again.");
      console.error("Return book error:", err);
    }
  };

  // Handle renewing a book
  const handleRenewBook = async (e) => {
    const loanId = e.target.dataset.loanId;

    try {
      const response = await fetch(`/api/loans/renew/${loanId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to renew book");
      }

      showError(data.message || "Book renewed successfully!", "success");

      // Update the loans and notifications
      fetchLoans();
      fetchNotifications();
    } catch (err) {
      showError(err.message || "Failed to renew book. Please try again.");
      console.error("Renew book error:", err);
    }
  };

  // Fetch penalty history
  const fetchPenaltyHistory = async () => {
    const penaltyHistoryContainer = document.getElementById(
      "penalty-history-container"
    );
    const totalPenaltyPointsElement = document.getElementById(
      "total-penalty-points"
    );

    if (!penaltyHistoryContainer) return; // Skip if we're not on the penalties page

    const userId = localStorage.getItem("userId");
    if (!userId) {
      showError("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`/api/loans/penalties/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch penalty history");
      }

      const data = await response.json();

      // Update the total penalty points
      if (totalPenaltyPointsElement && data.totalPenaltyPoints !== undefined) {
        totalPenaltyPointsElement.textContent = data.totalPenaltyPoints;
      }

      if (data.data.length === 0) {
        penaltyHistoryContainer.innerHTML =
          '<div class="alert alert-info">No penalty history found. Keep returning books on time!</div>';
        return;
      }

      // Render the penalty history
      penaltyHistoryContainer.innerHTML = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Book Title</th>
                                <th>Overdue Days</th>
                                <th>Penalty Date</th>
                                <th>Penalty Level</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data
                              .map(
                                (penalty) => `
                                <tr>
                                    <td>${penalty.title}</td>
                                    <td>${penalty.overdue_days}</td>
                                    <td>${new Date(
                                      penalty.penalty_date
                                    ).toLocaleDateString()}</td>
                                    <td>
                                        <span class="badge ${
                                          penalty.penalty_level === "Severe"
                                            ? "bg-danger"
                                            : penalty.penalty_level ===
                                              "Moderate"
                                            ? "bg-warning"
                                            : "bg-info"
                                        }">
                                            ${penalty.penalty_level}
                                        </span>
                                    </td>
                                    <td>${
                                      penalty.penalty_points ||
                                      penalty.overdue_days + 2
                                    }</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `;
    } catch (err) {
      console.error("Fetch penalty history error:", err);
      penaltyHistoryContainer.innerHTML =
        '<div class="alert alert-danger">Failed to load penalty history.</div>';
    }
  };

  // Fetch and update penalty points periodically
  const updatePenaltyPoints = async () => {
    const totalPenaltyPointsElement = document.getElementById(
      "total-penalty-points"
    );
    if (!totalPenaltyPointsElement) return; // Skip if the element doesn't exist

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
      const response = await fetch(`/api/loans/penalties/${userId}/points`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch penalty points");
      }

      const data = await response.json();

      // Update the total penalty points
      if (data.totalPoints !== undefined) {
        totalPenaltyPointsElement.textContent = data.totalPoints;
      }
    } catch (err) {
      console.error("Fetch penalty points error:", err);
    }
  };

  // Check penalty points periodically
  document.addEventListener("DOMContentLoaded", function () {
    const checkPenaltyPage = () => {
      const penaltyHistorySection = document.getElementById("penalty-history");
      if (
        penaltyHistorySection &&
        penaltyHistorySection.classList.contains("active")
      ) {
        updatePenaltyPoints();
      }
    };

    // Check every 30 seconds
    setInterval(checkPenaltyPage, 30000);

    // Also check when navigating between sections
    document.querySelectorAll(".sidebar-link").forEach((link) => {
      link.addEventListener("click", function () {
        // If navigating to the penalty history page, update the points
        if (this.getAttribute("href") === "#penalty-history") {
          setTimeout(updatePenaltyPoints, 200); // Short delay to ensure the section is active
        }
      });
    });
  });

  // Genre filter functionality
  if (genreFilter) {
    genreFilter.addEventListener("change", function () {
      filterBooks();
    });
  }

  // Display user name
  const displayUserName = () => {
    const userNameElement = document.getElementById("user-name");
    const userName = localStorage.getItem("userName") || "User";
    if (userNameElement) userNameElement.textContent = userName;
  };

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      showError("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`/api/notifications/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      renderNotifications(data.notifications || []);
      updateNotificationBadge(data.notifications || []);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      // Don't show an error message to avoid disrupting the user experience
      // Just render an empty state
      renderNotifications([]);
    }
  };

  // Render notifications in the notifications section
  const renderNotifications = (notifications) => {
    const notificationList = document.querySelector(".notification-list");
    if (!notificationList) return;

    if (notifications.length === 0) {
      notificationList.innerHTML =
        '<div class="alert alert-info">No notifications at this time.</div>';
      return;
    }

    notificationList.innerHTML = notifications
      .map(
        (notification) => `
        <div class="notification-item ${
          notification.read ? "" : "unread"
        }" data-id="${notification.id}">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
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
                  notification.type === "due_soon"
                    ? `<button class="btn btn-sm btn-primary renew-btn" data-loan-id="${notification.loanId}">Renew</button>`
                    : ""
                }
                ${
                  !notification.read
                    ? `<button class="btn btn-sm btn-outline-secondary mark-read-btn" data-id="${notification.id}">Mark as Read</button>`
                    : ""
                }
            </div>
        </div>
    `
      )
      .join("");

    // Add event listeners to the buttons
    document.querySelectorAll(".mark-read-btn").forEach((button) => {
      button.addEventListener("click", handleMarkAsRead);
    });

    document.querySelectorAll(".renew-btn").forEach((button) => {
      button.addEventListener("click", handleRenewBook);
    });
  };

  // Update the notification badge in the sidebar
  const updateNotificationBadge = (notifications) => {
    const badge = document.getElementById("notification-badge");
    if (!badge) return;

    const unreadCount = notifications.filter(
      (notification) => !notification.read
    ).length;

    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  };

  // Handle marking a notification as read
  const handleMarkAsRead = async (e) => {
    const notificationId = e.target.dataset.id;

    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update the UI without re-fetching all notifications
      const notificationItem = e.target.closest(".notification-item");
      if (notificationItem) {
        notificationItem.classList.remove("unread");
        e.target.remove(); // Remove the "Mark as Read" button
      }

      // Update the badge count
      const badge = document.getElementById("notification-badge");
      if (badge) {
        const currentCount = parseInt(badge.textContent);
        const newCount = currentCount - 1;
        if (newCount > 0) {
          badge.textContent = newCount;
        } else {
          badge.style.display = "none";
        }
      }
    } catch (err) {
      console.error("Mark as read error:", err);
      showError("Failed to mark notification as read. Please try again.");
    }
  };

  // Helper function to get the appropriate icon based on notification type
  const getNotificationIcon = (type) => {
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
  };

  // Helper function to format notification time
  const formatNotificationTime = (timestamp) => {
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
  };

   // Store profile data in local storage for persistence
   const storeProfileData = (user) => {
    // Only store if we have valid user data
    if (!user || typeof user !== "object") return;

    // Store each profile field in local storage
    const fieldsToStore = {
      userName: user.full_name || user.fullName || user.username,
      userEmail: user.email,
      userPhone: user.phone_number || user.phoneNumber,
      userAddress: user.address,
      // Keep the existing userId and token
      userId: localStorage.getItem("userId"),
      userRole: user.role || localStorage.getItem("userRole"),
    };

    // Set each item in local storage
    Object.entries(fieldsToStore).forEach(([key, value]) => {
      if (value) localStorage.setItem(key, value);
    });
  };

  // Display user profile data with improved handling
  const displayProfileData = (user) => {
    // Log the user data to see what we're working with
    console.log("User data received in displayProfileData:", user);

    // Check if the user object exists
    if (!user || typeof user !== "object") {
      console.error("Invalid or missing user data");
      return;
    }

    // Map API field names to form field IDs
    const fieldMappings = {
      username: "username",
      full_name: "fullName",
      email: "email",
      phone_number: "phone",
      address: "address",
    };

    // Update each form field if it exists
    Object.entries(fieldMappings).forEach(([apiField, formField]) => {
      const element = document.getElementById(formField);
      if (element) {
        // Use either the API field name or the client-side field name
        const value = user[apiField] || user[formField] || "";
        element.value = value;
        console.log(`Set ${formField} to:`, value);
      }
    });

    // Update the username display in the UI
    const displayName = user.full_name || user.fullName || user.username;
    if (displayName) {
      localStorage.setItem("userName", displayName);
      const userNameElement = document.getElementById("user-name");
      if (userNameElement) userNameElement.textContent = displayName;
    }

    // Store all profile data for persistence
    storeProfileData(user);
  };

 

  const loadProfileFromStorage = () => {
    const profileForm = document.getElementById("profile-form");
    if (!profileForm) return; // Not on the profile page

    // Map local storage keys to form fields
    const fieldMappings = {
      userName: "fullName",
      userEmail: "email",
      userPhone: "phone",
      userAddress: "address",
      username: "username",
    };

    // Try to load data from local storage into the form
    Object.entries(fieldMappings).forEach(([storageKey, formField]) => {
      const storedValue = localStorage.getItem(storageKey);
      const element = document.getElementById(formField);

      if (storedValue && element) {
        element.value = storedValue;
        console.log(`Loaded ${formField} from storage:`, storedValue);
      }
    });
  };

  // Handle profile form submission with improved error handling
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fullName = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const address = document.getElementById("address").value.trim();

      // Basic validation
      if (!fullName || !email) {
        showError("Full Name and Email are required.");
        return;
      }

      try {
        // Show loading indicator or disable the form while updating
        const submitButton = profileForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Updating...";
        }

        // Updated endpoint to match backend route
        const response = await fetch(`/api/users/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // Updated property names to match what the backend expects
          body: JSON.stringify({
            fullName,
            email,
            phoneNumber: phone,
            address,
          }),
        });

        const data = await response.json();
        console.log("Profile update response:", data);

        if (!response.ok) {
          throw new Error(data.message || "Failed to update profile");
        }

        showError("Profile updated successfully!", "success");

        // Create a user object with the updated data
        const updatedUser = {
          fullName,
          email,
          phone_number: phone,
          address,
        };

        // Store the updated profile data in local storage
        storeProfileData(updatedUser);

        // Use the returned user data directly if available
        if (data.data) {
          displayProfileData(data.data);
        } else {
          // Otherwise, just update with what we have
          displayProfileData(updatedUser);
        }
      } catch (err) {
        showError(err.message || "Failed to update profile. Please try again.");
        console.error("Update profile error:", err);
      } finally {
        // Re-enable the submit button
        const submitButton = profileForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Update Profile";
        }
      }
    });
  }

  // Fetch user profile data with improved error handling
  const fetchProfileData = async () => {
    try {
      console.log("Fetching profile data...");

      // Make sure we have a valid token
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await fetch("/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      console.log("Profile API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch profile data");
      }

      const data = await response.json();
      console.log("Profile API response data:", data);

      // Check if the data has a 'data' property (from your API structure)
      const userData = data.data || data;

      displayProfileData(userData);
    } catch (err) {
      console.error("Fetch profile error:", err);
      showError("Failed to fetch profile data. Please try again.");
    }
  };

  // Initialize the page
  displayUserName();
  fetchBooks();
  fetchLoans();
  fetchPenaltyHistory();
  fetchNotifications();
  fetchProfileData();

  loadProfileFromStorage();
  fetchProfileData();

  // Fetch profile data every 5 minutes
  setTimeout(fetchProfileData, 300);
});
