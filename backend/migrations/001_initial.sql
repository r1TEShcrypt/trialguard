CREATE TABLE users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(80) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE sessions (
 token_hash CHAR(64) PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 csrf_token CHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_session_expiry(expires_at)
);
CREATE TABLE categories (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(60) NOT NULL UNIQUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO categories(name) VALUES ('Entertainment'), ('Productivity'), ('Education'), ('Health & Fitness'), ('Cloud & Storage'), ('Other');
CREATE TABLE subscriptions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 category_id INT UNSIGNED NOT NULL,
 service_name VARCHAR(100) NOT NULL,
 price DECIMAL(12,2) NOT NULL,
 billing_cycle ENUM('monthly','yearly') NOT NULL,
 status ENUM('active','trial','cancelled') NOT NULL,
 start_date DATE NOT NULL,
 next_billing_date DATE NOT NULL,
 trial_end_date DATE NULL,
 provider_url VARCHAR(2048) NOT NULL DEFAULT '',
 notes TEXT NOT NULL,
 last_used_date DATE NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (category_id) REFERENCES categories(id),
 CONSTRAINT chk_price CHECK(price >= 0),
 CONSTRAINT chk_trial CHECK(status <> 'trial' OR trial_end_date IS NOT NULL),
 INDEX idx_sub_user_status_date(user_id,status,next_billing_date),
 INDEX idx_sub_trial(status,trial_end_date),
 INDEX idx_sub_category(user_id,category_id)
);
CREATE TABLE budgets (
 user_id BIGINT UNSIGNED PRIMARY KEY,
 monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT chk_budget CHECK(monthly_amount >= 0)
);
CREATE TABLE notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 subscription_id BIGINT UNSIGNED NULL,
 title VARCHAR(200) NOT NULL,
 message TEXT NOT NULL,
 read_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
 INDEX idx_notification_user_read(user_id,read_at,created_at)
);
CREATE TABLE reminder_deliveries (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 subscription_id BIGINT UNSIGNED NOT NULL,
 trial_end_date DATE NOT NULL,
 days_before TINYINT UNSIGNED NOT NULL,
 notification_id BIGINT UNSIGNED NOT NULL,
 email_status ENUM('unavailable','pending','sending','sent','failed') NOT NULL DEFAULT 'unavailable',
 email_error VARCHAR(200) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
 FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
 UNIQUE KEY uq_reminder(subscription_id,trial_end_date,days_before),
 INDEX idx_email_status(email_status)
);
