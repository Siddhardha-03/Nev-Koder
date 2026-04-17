USE nev_coder;

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER is_proctored,
  ADD COLUMN IF NOT EXISTS available_from_utc DATETIME NULL AFTER scheduling_enabled,
  ADD COLUMN IF NOT EXISTS available_until_utc DATETIME NULL AFTER available_from_utc;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'quizzes'
    AND index_name = 'idx_quizzes_schedule_window'
);

SET @create_idx_sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_quizzes_schedule_window ON quizzes (status, scheduling_enabled, available_from_utc, available_until_utc)',
  'SELECT 1'
);

PREPARE quiz_schedule_idx_stmt FROM @create_idx_sql;
EXECUTE quiz_schedule_idx_stmt;
DEALLOCATE PREPARE quiz_schedule_idx_stmt;
