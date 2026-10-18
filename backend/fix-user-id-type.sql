-- Fix user_id type mismatch
-- The database expects INTEGER but the code generates string/UUID

-- Step 1: Drop dependent tables (CASCADE will drop related data)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS threads CASCADE;

-- Step 2: Alter users table to use text for id (if not already)
-- First check what type 'id' is - if it's SERIAL/INTEGER, we need to change it
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 3: Recreate threads table with TEXT user_id
CREATE TABLE threads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 4: Recreate messages table with TEXT thread_id
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

-- Step 5: Recreate indexes
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);

-- Done! Now user_id and thread_id are TEXT instead of INTEGER
