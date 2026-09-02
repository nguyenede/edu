USE student_management_system;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER status;

-- Hồ sơ học sinh mở rộng: hộ tịch, liên hệ khẩn cấp và quá trình nhập học.
ALTER TABLE students ADD COLUMN IF NOT EXISTS place_of_birth VARCHAR(255) NULL AFTER date_of_birth;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) NULL AFTER place_of_birth;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ethnicity VARCHAR(100) NULL AFTER nationality;
ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_number VARCHAR(20) NULL AFTER ethnicity;
ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_issue_date DATE NULL AFTER identity_number;
ALTER TABLE students ADD COLUMN IF NOT EXISTS identity_issue_place VARCHAR(255) NULL AFTER identity_issue_date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS permanent_address TEXT NULL AFTER address;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100) NULL AFTER permanent_address;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20) NULL AFTER emergency_contact_name;
ALTER TABLE students ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255) NULL AFTER admission_date;
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_identity_number ON students(identity_number);

CREATE TABLE IF NOT EXISTS student_health (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL UNIQUE,
    height_cm DECIMAL(5,1) NULL,
    weight_kg DECIMAL(5,1) NULL,
    blood_type VARCHAR(5) NULL,
    allergies TEXT NULL,
    medical_history TEXT NULL,
    physical_status VARCHAR(100) NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_behavior (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    type ENUM('reward', 'discipline') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    date DATE NOT NULL,
    decision_number VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_behavior_student_date(student_id, date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    category ENUM('general', 'academic', 'system') NOT NULL DEFAULT 'general',
    description VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO settings (setting_key, setting_value, category, description) VALUES
('school_name', 'Trường THPT StudentOS', 'general', 'Tên trường học'),
('school_code', 'SOS-001', 'general', 'Mã trường'),
('school_address', '123 Apple Way, Cupertino, CA', 'general', 'Địa chỉ trường'),
('current_academic_year', '2025-2026', 'academic', 'Năm học hiện tại'),
('default_semester', 'Semester 1', 'academic', 'Học kỳ mặc định'),
('password_min_length', '8', 'system', 'Độ dài mật khẩu tối thiểu')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- Run these only once on databases that do not already have the indexes.
CREATE INDEX IF NOT EXISTS idx_payment_status_due ON payments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_notification_delivery ON notifications(status, audience_type, audience_value, created_at);
CREATE INDEX IF NOT EXISTS idx_file_owner ON files(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_schedule_class_day ON schedules(class_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_day ON schedules(teacher_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_room_day ON schedules(room, day_of_week, start_time);

ALTER TABLE grades
  ADD UNIQUE INDEX IF NOT EXISTS uq_grade_record(student_id, class_id, subject_id, semester, academic_year);
