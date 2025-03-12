# LibraryHub Backend

## Overview
The LibraryHub backend is a RESTful API built using Node.js and Express.js, designed to support the LibraryHub frontend application. It provides endpoints for user authentication, book management, loan management, and user management. The backend interacts with a MySQL database to store and retrieve data.

## Features

### User Authentication
- **Registration**: Users can register with a username, email, password, and department.
- **Login**: Users can log in with their credentials and receive a JWT token for authentication.
- **Role-based Access**: Supports two roles: Admin and User, with different permissions.

### Book Management
- **Add Book**: Admins can add new books with details such as title, author, ISBN, genre, and quantity.
- **Get All Books**: Fetch a list of all books in the library.
- **Update Book**: Admins can update book details.
- **Delete Book**: Admins can delete books from the library.
- **Search Books**: Users can search for books by title, author, or genre.

### Loan Management
- **Borrow Book**: Users can borrow available books, with a progressive penalty system for overdue books.
- **Return Book**: Users can return borrowed books, with penalties applied for late returns.
- **Get User Loans**: Fetch all loans for a specific user, including due dates and overdue status.
- **Penalty History**: Track penalty history for users who return books late.

### User Management
- **Add User**: Admins can add new users with details such as username, email, password, and role.
- **Get All Users**: Fetch a list of all users.
- **Delete User**: Admins can delete users from the system.
- **User Profile**: Users can view and update their profile information.

## Technologies Used
- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for building RESTful APIs.
- **MySQL**: Relational database for storing data.
- **JWT (JSON Web Tokens)**: For user authentication and authorization.
- **Bcrypt.js**: For password hashing and security.
- **CORS**: Middleware for enabling cross-origin requests.
- **Dotenv**: For managing environment variables.

## File Structure
```
backend/
│
├── config/                  # Configuration files
│   └── db.js               # Database connection setup
│
├── controllers/            # Controllers for handling requests
│   ├── authController.js   # Authentication logic
│   ├── bookController.js   # Book management logic
│   ├── loanController.js   # Loan management logic
│   └── userController.js   # User management logic
│
├── models/                 # Database models
│   ├── Book.js             # Book model
│   ├── Loan.js             # Loan model
│   └── User.js             # User model
│
├── routes/                 # API routes
│   ├── authRoutes.js       # Authentication routes
│   ├── bookRoutes.js       # Book management routes
│   ├── loanRoutes.js       # Loan management routes
│   └── userRoutes.js       # User management routes
│
├── .env                    # Environment variables
├── server.js               # Main server file
└── README.md               # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user.
- `POST /api/auth/login` - Log in and receive a JWT token.

### Book Management
- `POST /api/books` - Add a new book (Admin only).
- `GET /api/books` - Get all books.
- `PUT /api/books/:id` - Update a book by ID (Admin only).
- `DELETE /api/books/:id` - Delete a book by ID (Admin only).
- `GET /api/books/search` - Search for books by title, author, or genre.
- `GET /api/books/:id` - Get a single book by ID.

### Loan Management
- `POST /api/loans/borrow` - Borrow a book.
- `PUT /api/loans/return/:loanId` - Return a borrowed book.
- `GET /api/loans/user/:userId` - Get all loans for a specific user.
- `GET /api/loans/penalties/:userId` - Get penalty history for a user.

### User Management
- `POST /api/users` - Add a new user (Admin only).
- `GET /api/users` - Get all users (Admin only).
- `DELETE /api/users/:id` - Delete a user by ID (Admin only).
- `GET /api/users/profile` - Get user profile.
- `PUT /api/users/profile` - Update user profile.

## Setup Instructions



### Install Dependencies:
```sh
npm install
```

### Set Up Environment Variables:
1. Create a `.env` file in the root directory.
2. Add the following variables:
```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Run the Server:
```sh
npm start
```

### Access the API:
The API will be running on `http://localhost:5000`.

## Database Schema
The backend uses a MySQL database with the following tables:
- **users**: Stores user information (username, email, password, role, etc.).
- **books**: Stores book information (title, author, ISBN, genre, quantity, etc.).
- **loans**: Stores loan information (user_id, book_id, borrow_date, due_date, returned, etc.).
- **penalties**: Stores penalty information for overdue books (user_id, loan_id, overdue_days, penalty_date, etc.).

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes.

