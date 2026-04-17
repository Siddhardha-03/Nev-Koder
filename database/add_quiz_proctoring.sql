USE nev_coder;

CREATE TABLE IF NOT EXISTS quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Easy',
  is_proctored BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit_minutes INT NOT NULL DEFAULT 15,
  passing_score INT NOT NULL DEFAULT 60,
  max_attempts INT NOT NULL DEFAULT 3,
  auto_submit_on_violation BOOLEAN NOT NULL DEFAULT FALSE,
  violation_auto_submit_threshold INT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quizzes_status (status),
  INDEX idx_quizzes_difficulty (difficulty),
  CONSTRAINT fk_quizzes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question_text LONGTEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
  explanation TEXT NULL,
  question_order INT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quiz_question_order (quiz_id, question_order),
  INDEX idx_quiz_questions_quiz (quiz_id),
  CONSTRAINT fk_quiz_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  attempt_number INT NOT NULL,
  status ENUM('in_progress', 'submitted', 'auto_submitted') NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  total_questions INT NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  accuracy_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  tab_switch_count INT NOT NULL DEFAULT 0,
  violation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quiz_attempt_number (quiz_id, user_id, attempt_number),
  INDEX idx_quiz_attempts_user (user_id),
  INDEX idx_quiz_attempts_quiz (quiz_id),
  INDEX idx_quiz_attempts_status (status),
  CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attempt_id INT NOT NULL,
  quiz_question_id INT NOT NULL,
  selected_option ENUM('A', 'B', 'C', 'D') NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned INT NOT NULL DEFAULT 0,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attempt_question (attempt_id, quiz_question_id),
  INDEX idx_quiz_attempt_answers_attempt (attempt_id),
  CONSTRAINT fk_quiz_attempt_answers_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_attempt_answers_question FOREIGN KEY (quiz_question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_violations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attempt_id INT NOT NULL,
  violation_type ENUM('tab_switch', 'copy_blocked', 'context_menu_blocked', 'right_click_blocked') NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quiz_violations_attempt (attempt_id),
  INDEX idx_quiz_violations_type (violation_type),
  CONSTRAINT fk_quiz_violations_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);
