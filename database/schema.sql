-- Create nev_coder database
CREATE DATABASE IF NOT EXISTS nev_coder;
USE nev_coder;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  last_otp_sent_at TIMESTAMP NULL,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_is_verified (is_verified),
  INDEX idx_role (role)
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  function_name VARCHAR(255) NULL,
  description LONGTEXT NOT NULL,
  difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Easy',
  question_type VARCHAR(100) NULL,
  parameter_schema JSON NULL,
  tags JSON NULL,
  examples JSON NULL,
  has_boilerplate BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_question_title (title),
  INDEX idx_question_difficulty (difficulty),
  INDEX idx_question_type (question_type),
  CONSTRAINT fk_questions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  input LONGTEXT NOT NULL,
  expected_output LONGTEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_test_cases_question_id (question_id),
  CONSTRAINT fk_test_cases_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- OTP table
CREATE TABLE IF NOT EXISTS otp_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token)
);

-- Login attempts table (for rate limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_email VARCHAR(100) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_time (user_email, attempted_at)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token)
);

-- Solved questions per user
CREATE TABLE IF NOT EXISTS user_solved_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_question (user_id, question_id),
  INDEX idx_solved_user (user_id),
  INDEX idx_solved_question (question_id),
  CONSTRAINT fk_solved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_solved_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Learning paths created by admin/instructors
CREATE TABLE IF NOT EXISTS learning_paths (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_learning_paths_title (title),
  CONSTRAINT fk_learning_paths_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Ordered topic blocks within each learning path
CREATE TABLE IF NOT EXISTS learning_path_topics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  learning_path_id INT NOT NULL,
  topic_title VARCHAR(255) NOT NULL,
  topic_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_path_topic_order (learning_path_id, topic_order),
  INDEX idx_learning_path_topics_path (learning_path_id),
  CONSTRAINT fk_learning_path_topics_path FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
);

-- Ordered problem mapping for each topic
CREATE TABLE IF NOT EXISTS learning_path_topic_problems (
  id INT PRIMARY KEY AUTO_INCREMENT,
  topic_id INT NOT NULL,
  question_id INT NOT NULL,
  problem_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_topic_problem (topic_id, question_id),
  UNIQUE KEY uq_topic_problem_order (topic_id, problem_order),
  INDEX idx_learning_path_topic_problems_topic (topic_id),
  INDEX idx_learning_path_topic_problems_question (question_id),
  CONSTRAINT fk_learning_path_topic_problems_topic FOREIGN KEY (topic_id) REFERENCES learning_path_topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_path_topic_problems_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
