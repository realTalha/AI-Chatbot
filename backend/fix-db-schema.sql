-- Fix Database Schema - Run this in Railway PostgreSQL

-- Option 1: Add email column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Option 2: Or drop and recreate the users table (WARNING: deletes all users!)
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS threads CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- CREATE TABLE users (
--     id SERIAL PRIMARY KEY,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE threads (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
--     title VARCHAR(500),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE messages (
--     id SERIAL PRIMARY KEY,
--     thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
--     role VARCHAR(50) NOT NULL,
--     content TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE sessions (
--     sid VARCHAR PRIMARY KEY,
--     sess JSON NOT NULL,
--     expire TIMESTAMP NOT NULL
-- );

-- CREATE INDEX idx_sessions_expire ON sessions(expire);
-- CREATE INDEX idx_threads_user_id ON threads(user_id);
-- CREATE INDEX idx_messages_thread_id ON messages(thread_id);
