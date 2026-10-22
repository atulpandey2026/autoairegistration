CREATE TABLE IF NOT EXISTS admins (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS registrations (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 registration_code VARCHAR(36) NOT NULL UNIQUE,
 contact_name VARCHAR(150) NOT NULL,
 email VARCHAR(190) NOT NULL,
 phone VARCHAR(35) NOT NULL,
 company VARCHAR(190) NOT NULL,
 designation VARCHAR(150) DEFAULT '',
 gstin VARCHAR(20) DEFAULT '',
 billing_address TEXT,
 pass_name VARCHAR(50) NOT NULL,
 delegate_count INT NOT NULL,
 unit_price INT NOT NULL,
 subtotal INT NOT NULL,
 gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
 gst_amount INT NOT NULL,
 total INT NOT NULL,
 payment_status ENUM('Pending','Paid','Cancelled','Partially Paid','Refunded') NOT NULL DEFAULT 'Pending',
 status ENUM('Pending','Confirmed','Cancelled') NOT NULL DEFAULT 'Pending',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_registration_email (email), INDEX idx_registration_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS delegates (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 registration_id BIGINT UNSIGNED NOT NULL,
 full_name VARCHAR(150) NOT NULL,
 email VARCHAR(190) NOT NULL,
 phone VARCHAR(35) DEFAULT '',
 designation VARCHAR(150) DEFAULT '',
 company VARCHAR(190) NOT NULL DEFAULT '',
 pass_token VARCHAR(64) NOT NULL UNIQUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_delegates_registration FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
 INDEX idx_delegate_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS email_queue (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 recipient VARCHAR(190) NOT NULL,
 subject VARCHAR(255) NOT NULL,
 body MEDIUMTEXT NOT NULL,
 status ENUM('Pending','Sent','Failed') NOT NULL DEFAULT 'Pending',
 attempts INT NOT NULL DEFAULT 0,
 last_error VARCHAR(255) DEFAULT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 sent_at DATETIME DEFAULT NULL,
 INDEX idx_email_queue_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
