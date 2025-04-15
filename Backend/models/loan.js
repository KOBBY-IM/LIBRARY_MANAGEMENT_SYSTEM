const pool = require("../config/db");

const loan = {
  // Get all loans for a user
  async getUserLoans(userId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        "SELECT l.id, b.title, b.author, l.due_date, l.returned FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ?",
        [userId]
      );
      return rows;
    } catch (err) {
      console.error("Error fetching user loans:", err);
      throw err;
    } finally {
      connection.release();
    }
  },

  // Borrow a book

  async borrowBook(userId, bookId, dueDate) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current quarter (implement the same getCurrentQuarterInfo function used in the controller)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      let quarter;

      if (month < 3) quarter = 1;
      else if (month < 6) quarter = 2;
      else if (month < 9) quarter = 3;
      else quarter = 4;

      const quarterLabel = `Q${quarter} ${year}`;

      // Check user's quarterly penalty points
      const [userPenalty] = await connection.query(
        "SELECT quarterly_penalty_points FROM users WHERE id = ?",
        [userId]
      );

      // Default max loans
      let maxLoans = 10;
      let penaltyPoints = 0;

      if (
        userPenalty.length > 0 &&
        userPenalty[0].quarterly_penalty_points !== null
      ) {
        penaltyPoints = userPenalty[0].quarterly_penalty_points;

        // Apply penalty based on accumulated quarterly points with updated thresholds
        if (penaltyPoints >= 20) {
          maxLoans = 0; // Borrowing blocked: Cannot borrow any books
        } else if (penaltyPoints >= 13) {
          maxLoans = 4; // Severe penalty: reduce by 6 books (10-6=4)
        } else if (penaltyPoints >= 9) {
          maxLoans = 6; // Moderate penalty: reduce by 4 books (10-4=6)
        } else if (penaltyPoints >= 5) {
          maxLoans = 8; // Mild penalty: reduce by 2 books (10-2=8)
        }
        // No penalty for 0-4 points (maxLoans remains 10)
      }

      // FIXED ORDER: First check if borrowing is suspended (maxLoans = 0)
      if (maxLoans === 0) {
        throw new Error(
          `Borrowing privileges suspended: You have ${penaltyPoints} penalty points this quarter (${quarterLabel}). Please speak with a librarian.`
        );
      }

      // Check if the user has already borrowed the maximum number of books
      const [loans] = await connection.query(
        "SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned = FALSE",
        [userId]
      );

      if (loans[0].count >= maxLoans) {
        throw new Error(
          `You have reached the maximum number of borrowed books (${maxLoans})`
        );
      }

      // NEW CHECK: Check if the user already has an active loan for this book
      const [existingLoan] = await connection.query(
        "SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND returned = FALSE",
        [userId, bookId]
      );

      if (existingLoan.length > 0) {
        throw new Error(
          "You already have an active loan for this book. You cannot borrow multiple copies of the same book."
        );
      }

      // Check if the book is available
      const [book] = await connection.query(
        "SELECT quantity FROM books WHERE id = ?",
        [bookId]
      );
      if (!book.length || book[0].quantity < 1) {
        throw new Error("Book not available");
      }

      // Reduce book quantity
      await connection.query(
        "UPDATE books SET quantity = quantity - 1 WHERE id = ?",
        [bookId]
      );

      // Add loan record with quarter information
      const [result] = await connection.query(
        "INSERT INTO loans (user_id, book_id, due_date, quarter) VALUES (?, ?, ?, ?)",
        [userId, bookId, dueDate, quarterLabel]
      );

      await connection.commit();

      return {
        success: true,
        maxLoansAllowed: maxLoans,
        penaltyPoints: penaltyPoints,
        quarter: quarterLabel,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Return a book
  async returnBook(loanId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get loan details
      const [loanDetails] = await connection.query(
        "SELECT l.*, b.id as book_id, b.title FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?",
        [loanId]
      );

      if (loanDetails.length === 0) {
        throw new Error("Loan record not found");
      }

      const loan = loanDetails[0];

      // Check if already returned
      if (loan.returned) {
        throw new Error("This book has already been returned");
      }

      // Get current quarter
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      let quarter;

      if (month < 3) quarter = 1;
      else if (month < 6) quarter = 2;
      else if (month < 9) quarter = 3;
      else quarter = 4;

      const quarterLabel = `Q${quarter} ${year}`;

      // Check if overdue and apply penalty
      const dueDate = new Date(loan.due_date);
      const today = new Date();
      let penaltyPoints = 0;

      if (dueDate < today) {
        // Calculate days overdue
        const diffTime = Math.abs(today - dueDate);
        const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Apply penalty (1 point per day)
        penaltyPoints = overdueDays;

        // Record penalty points
        try {
          await connection.query(
            "UPDATE users SET quarterly_penalty_points = quarterly_penalty_points + ?, last_penalty_quarter = ? WHERE id = ?",
            [penaltyPoints, quarterLabel, loan.user_id]
          );

          // Record in penalties table
          await connection.query(
            "INSERT INTO penalties (user_id, loan_id, overdue_days, penalty_points, penalty_date, quarter) VALUES (?, ?, ?, ?, NOW(), ?)",
            [loan.user_id, loanId, overdueDays, penaltyPoints, quarterLabel]
          );
        } catch (err) {
          console.log("Could not record penalty, table might not exist:", err);
        }
      }

      // Mark loan as returned
      await connection.query(
        "UPDATE loans SET returned = TRUE, return_date = NOW() WHERE id = ?",
        [loanId]
      );

      // Increase book quantity
      await connection.query(
        "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
        [loan.book_id]
      );

      await connection.commit();

      return {
        success: true,
        bookTitle: loan.title,
        penaltyPoints: penaltyPoints,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Delete a loan
  async deleteLoan(loanId) {
    const connection = await pool.getConnection();
    try {
      await connection.query("DELETE FROM loans WHERE id = ?", [loanId]);
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = loan;
