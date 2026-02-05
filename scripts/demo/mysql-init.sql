-- MySQL Demo Database Initialization
-- ==================================
-- This script creates sample tables and data for the DBackup demo.

-- Create demo_app database if not exists (Docker handles this via MYSQL_DATABASE)
-- USE demo_app;

-- ==========================================
-- Sample E-Commerce Schema
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ==========================================
-- Sample Data
-- ==========================================

-- Insert sample users
INSERT INTO users (email, name, password_hash) VALUES
('alice@example.com', 'Alice Johnson', 'hashed_password_1'),
('bob@example.com', 'Bob Smith', 'hashed_password_2'),
('charlie@example.com', 'Charlie Brown', 'hashed_password_3'),
('diana@example.com', 'Diana Prince', 'hashed_password_4'),
('eve@example.com', 'Eve Wilson', 'hashed_password_5');

-- Insert sample products
INSERT INTO products (name, description, price, stock, category) VALUES
('Laptop Pro 15', 'High-performance laptop with 16GB RAM', 1299.99, 50, 'Electronics'),
('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 29.99, 200, 'Electronics'),
('Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 149.99, 75, 'Electronics'),
('USB-C Hub', '7-in-1 USB-C hub with HDMI and SD card reader', 49.99, 150, 'Accessories'),
('Monitor Stand', 'Adjustable aluminum monitor stand', 79.99, 100, 'Accessories'),
('Webcam HD', '1080p HD webcam with built-in microphone', 89.99, 80, 'Electronics'),
('Desk Lamp', 'LED desk lamp with adjustable brightness', 39.99, 120, 'Home Office'),
('Notebook Set', 'Pack of 3 premium notebooks', 19.99, 300, 'Stationery'),
('Coffee Mug', 'Insulated stainless steel coffee mug', 24.99, 250, 'Kitchen'),
('Headphones', 'Noise-cancelling over-ear headphones', 199.99, 60, 'Electronics');

-- Insert sample orders
INSERT INTO orders (user_id, total, status) VALUES
(1, 1349.98, 'delivered'),
(2, 229.97, 'shipped'),
(3, 49.99, 'processing'),
(4, 1499.98, 'pending'),
(5, 89.99, 'delivered'),
(1, 199.99, 'shipped'),
(2, 119.98, 'delivered'),
(3, 329.97, 'processing');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 1299.99),
(1, 4, 1, 49.99),
(2, 3, 1, 149.99),
(2, 2, 1, 29.99),
(2, 4, 1, 49.99),
(3, 4, 1, 49.99),
(4, 1, 1, 1299.99),
(4, 10, 1, 199.99),
(5, 6, 1, 89.99),
(6, 10, 1, 199.99),
(7, 7, 1, 39.99),
(7, 8, 4, 79.96),
(8, 3, 1, 149.99),
(8, 2, 2, 59.98),
(8, 7, 3, 119.97);

-- Create a second database for multi-db backup testing
CREATE DATABASE IF NOT EXISTS demo_analytics;
USE demo_analytics;

-- Analytics events table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample events
INSERT INTO events (event_type, user_id, metadata) VALUES
('page_view', 1, '{"page": "/products", "duration": 45}'),
('add_to_cart', 1, '{"product_id": 1, "quantity": 1}'),
('checkout', 1, '{"order_id": 1, "total": 1349.98}'),
('page_view', 2, '{"page": "/", "duration": 12}'),
('search', 2, '{"query": "keyboard", "results": 1}'),
('page_view', 3, '{"page": "/products/4", "duration": 30}'),
('add_to_cart', 3, '{"product_id": 4, "quantity": 1}'),
('page_view', 4, '{"page": "/checkout", "duration": 120}'),
('signup', 5, '{"source": "google"}'),
('page_view', 5, '{"page": "/products", "duration": 60}');
