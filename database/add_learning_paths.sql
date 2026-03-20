USE nev_coder;

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
