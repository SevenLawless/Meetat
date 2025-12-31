-- Migration script to update users.role ENUM from ('admin', 'user') to ('normal', 'marketing', 'admin')
-- Run this script in your MySQL database

USE meetat;

-- First, update any existing 'user' roles to 'normal'
UPDATE users SET role = 'normal' WHERE role = 'user';

-- Alter the ENUM column to include the new values
-- Note: MySQL requires you to specify ALL values when modifying an ENUM
ALTER TABLE users MODIFY COLUMN role ENUM('normal', 'marketing', 'admin') DEFAULT 'normal';

