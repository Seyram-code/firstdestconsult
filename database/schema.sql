CREATE TABLE IF NOT EXISTS app_records (
  collection VARCHAR(40) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (collection, record_id),
  KEY app_records_created_at (collection, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
