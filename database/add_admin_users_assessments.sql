USE nev_coder;

CREATE TABLE IF NOT EXISTS assessments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('assessment', 'assignment') NOT NULL DEFAULT 'assessment',
  difficulty VARCHAR(40) NULL,
  category VARCHAR(120) NULL,
  time_limit_minutes INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessments_type (type),
  INDEX idx_assessments_updated (updated_at),
  CONSTRAINT fk_assessments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assessment_id INT NOT NULL,
  question_id INT NOT NULL,
  question_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_question (assessment_id, question_id),
  UNIQUE KEY uq_assessment_question_order (assessment_id, question_order),
  INDEX idx_assessment_questions_assessment (assessment_id),
  INDEX idx_assessment_questions_question (question_id),
  CONSTRAINT fk_assessment_questions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_questions_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
