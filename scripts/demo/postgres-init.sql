-- PostgreSQL Demo Database Initialization
-- ======================================
-- This script creates sample tables and data for the DBackup demo.

-- ==========================================
-- Sample Blog/CMS Schema
-- ==========================================

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id INTEGER REFERENCES authors(id),
    category_id INTEGER REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE
);

-- Post-Tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Sample Data
-- ==========================================

-- Insert authors
INSERT INTO authors (email, name, bio) VALUES
('john@techblog.com', 'John Developer', 'Senior software engineer with 10+ years of experience in web development.'),
('sarah@techblog.com', 'Sarah Designer', 'UX/UI designer passionate about creating beautiful and functional interfaces.'),
('mike@techblog.com', 'Mike DevOps', 'DevOps engineer specializing in cloud infrastructure and automation.');

-- Insert categories
INSERT INTO categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest tech news and tutorials'),
('Design', 'design', 'UI/UX design tips and inspiration'),
('DevOps', 'devops', 'Infrastructure, CI/CD, and automation'),
('Programming', 'programming', 'Coding tutorials and best practices');

-- Insert tags
INSERT INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('Python', 'python'),
('Docker', 'docker'),
('Kubernetes', 'kubernetes'),
('React', 'react'),
('CSS', 'css'),
('Database', 'database'),
('Security', 'security'),
('API', 'api'),
('Tutorial', 'tutorial');

-- Insert posts
INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, published_at) VALUES
('Getting Started with Docker', 'getting-started-docker',
 'Docker has revolutionized how we deploy applications. In this guide, we will explore the basics of containerization and how to get started with Docker.

## What is Docker?

Docker is a platform for developing, shipping, and running applications in containers. Containers are lightweight, standalone packages that contain everything needed to run an application.

## Installing Docker

To install Docker, visit docker.com and download Docker Desktop for your operating system...',
 'Learn the basics of Docker containerization in this comprehensive guide.',
 3, 3, 'published', NOW() - INTERVAL '5 days'),

('Modern CSS Techniques for 2026', 'modern-css-techniques-2026',
 'CSS has evolved significantly over the years. Let us explore the latest techniques that every developer should know.

## Container Queries

Container queries allow you to style elements based on the size of their container rather than the viewport...

## CSS Layers

CSS layers provide a powerful way to manage specificity in large projects...',
 'Discover the latest CSS features and techniques to enhance your web designs.',
 2, 2, 'published', NOW() - INTERVAL '3 days'),

('Building REST APIs with Node.js', 'building-rest-apis-nodejs',
 'REST APIs are the backbone of modern web applications. In this tutorial, we will build a complete REST API using Node.js and Express.

## Setting Up the Project

First, create a new directory and initialize a Node.js project...

## Creating Routes

Express makes it easy to define routes for your API...',
 'A complete guide to building RESTful APIs with Node.js and Express.',
 1, 4, 'published', NOW() - INTERVAL '1 day'),

('Kubernetes for Beginners', 'kubernetes-beginners',
 'Kubernetes (K8s) is the leading container orchestration platform. This guide will help you understand the core concepts.',
 'An introduction to Kubernetes and container orchestration.',
 3, 3, 'draft', NULL),

('React Hooks Deep Dive', 'react-hooks-deep-dive',
 'React Hooks have changed how we write React components. Let us explore all the built-in hooks and when to use them.',
 'Master React Hooks with practical examples and best practices.',
 1, 4, 'published', NOW() - INTERVAL '7 days');

-- Link posts to tags
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 3), -- Docker post -> Docker tag
(1, 4), -- Docker post -> Kubernetes tag
(1, 10), -- Docker post -> Tutorial tag
(2, 6), -- CSS post -> CSS tag
(3, 1), -- Node.js post -> JavaScript tag
(3, 9), -- Node.js post -> API tag
(3, 10), -- Node.js post -> Tutorial tag
(4, 3), -- K8s post -> Docker tag
(4, 4), -- K8s post -> Kubernetes tag
(5, 1), -- React post -> JavaScript tag
(5, 5); -- React post -> React tag

-- Insert comments
INSERT INTO comments (post_id, author_name, author_email, content, approved) VALUES
(1, 'Alex Reader', 'alex@example.com', 'Great introduction to Docker! This helped me understand containers much better.', true),
(1, 'Maria Dev', 'maria@example.com', 'Could you add a section about Docker Compose?', true),
(2, 'Tom Designer', 'tom@example.com', 'The container queries section is exactly what I needed!', true),
(3, 'Emma Coder', 'emma@example.com', 'Very well explained. Would love to see a follow-up on authentication.', true),
(3, 'spam@spam.com', 'spam', 'Check out my website for free stuff!', false),
(5, 'React Fan', 'fan@example.com', 'useCallback and useMemo examples were super helpful.', true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
