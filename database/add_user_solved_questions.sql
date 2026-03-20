USE nev_coder;

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
