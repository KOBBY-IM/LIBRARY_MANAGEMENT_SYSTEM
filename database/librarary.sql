-- Database creation
CREATE DATABASE IF NOT EXISTS libraryhub;
USE libraryhub;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    full_name VARCHAR(255) NULL,
    address TEXT NULL,
    phone_number VARCHAR(20) NULL,
    quarterly_penalty_points INT DEFAULT 0,
    last_penalty_quarter VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books Table
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) NULL,
    genre VARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1,
    cover_image_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    return_date TIMESTAMP NULL,
    returned BOOLEAN DEFAULT FALSE,
    quarter VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Penalties Table 
CREATE TABLE IF NOT EXISTS penalties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_id INT NOT NULL,
    overdue_days INT NOT NULL,
    penalty_points INT NOT NULL,
    penalty_date DATETIME NOT NULL,
    quarter VARCHAR(10) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    loan_id INT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    `read` BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    INDEX (user_id),
    INDEX (loan_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
);

-- System Message Tracking Table
CREATE TABLE IF NOT EXISTS deleted_system_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_id INT NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_system_message (user_id, loan_id, message_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);