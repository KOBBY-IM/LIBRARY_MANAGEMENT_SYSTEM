# LibraryHub - Complete Project

## Overview
LibraryHub is a full-stack library management system designed to provide users with easy access to a wide range of books, journals, and digital resources. The system supports two main user roles: **Admin** and **User**, each with distinct functionalities. The project consists of a **frontend** built with HTML, CSS, and JavaScript, and a **backend** built with Node.js, Express.js, and MySQL.

**Assessment Project for CMM007 - Intranet Systems Development @ RGU**

GitHub Repository: [LibraryHub Management System](https://github.com/KOBBY-IM/LIBRARY_MANAGEMENT_SYSTEM.git)

## Features

### Admin Features
#### Book Management
- Add, edit, and delete books.
- Search and filter books by title, author, or genre.

#### User Management
- Add and delete users.
- View all users and their details.

### User Features
#### Book Search & Borrowing
- Search for books by title, author, or genre.
- Borrow available books.

#### Loan Management
- View currently borrowed books.
- Return borrowed books.
- Check due dates and overdue status.

#### Penalty System
- Progressive penalties for overdue books.
- View penalty history and borrowing limits.

#### Profile Management
- Update personal information such as name, phone, and address.

### General Features
#### User Authentication
- Login and registration with role-based access (**Admin** or **User**).

#### Responsive Design
- Fully responsive frontend that works seamlessly on desktop, tablet, and mobile devices.

## Technologies Used

### Frontend
- **HTML5**: For structuring the web pages.
- **CSS3**: For styling the web pages.
- **Bootstrap 5**: For responsive design and pre-built components.
- **JavaScript**: For dynamic functionality and interactivity.
- **Font Awesome**: For icons used throughout the application.
- **Google Fonts**: For custom typography.

### Backend
- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for building RESTful APIs.
- **MySQL**: Relational database for storing data.
- **JWT (JSON Web Tokens)**: For user authentication and authorization.
- **Bcrypt.js**: For password hashing and security.
- **CORS**: Middleware for enabling cross-origin requests.
- **Dotenv**: For managing environment variables.

## Project Structure

### Frontend
```
frontend/
├── css/                    # Custom CSS files
│   ├── style.css           # Main stylesheet
│   └── user-dashboard.css  # Additional styles for user dashboard
│
├── js/                     # JavaScript files
│   ├── admin.js            # Admin-specific functionality
│   ├── editBook.js         # Edit book functionality
│   ├── login.js            # Login and authentication logic
│   ├── navigation.js       # Navigation and sidebar functionality
│   ├── script.js           # Registration and form handling
│   └── user.js             # User-specific functionality
│
├── pages/                  # HTML pages
│   ├── admin.html          # Admin dashboard
│   ├── editBook.html       # Edit book page
│   ├── login.html          # Login page
│   └── user.html           # User dashboard
│
├── images/                 # Image assets
│   └── logo.png            # LibraryHub logo
│
└── index.html              # Homepage with registration form
```

### Backend
```
backend/
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

## Setup Instructions

### Frontend
#### Clone the Repository
```sh
git clone https://github.com/KOBBY-IM/LIBRARY_MANAGEMENT_SYSTEM.git
cd LIBRARY_MANAGEMENT_SYSTEM/Frontend
```

#### Open the Project
- Open `index.html` in your browser to access the homepage.
- Navigate to `pages/login.html` to log in as an admin or user.

#### Run the Application
- The frontend is static and can be run directly in the browser without any additional setup.

### Backend
#### Clone the Repository
```sh
git clone https://github.com/KOBBY-IM/LIBRARY_MANAGEMENT_SYSTEM.git
cd LIBRARY_MANAGEMENT_SYSTEM/Backend
```

#### Install Dependencies
```sh
npm install
```

#### Set Up Environment Variables
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

#### Run the Server
```sh
npm start
```

#### Access the API
The API will be running on `http://localhost:5000`.

## Database Schema
The backend uses a MySQL database with the following tables:
- **users**: Stores user information (username, email, password, role, etc.).
- **books**: Stores book information (title, author, ISBN, genre, quantity, etc.).
- **loans**: Stores loan information (user_id, book_id, borrow_date, due_date, returned, etc.).
- **penalties**: Stores penalty information for overdue books (user_id, loan_id, overdue_days, penalty_date, etc.).

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.

