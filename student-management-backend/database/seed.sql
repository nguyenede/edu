USE student_management_system;

-- Insert Users (Password: 123456)
-- Hash for 123456: $2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.
INSERT INTO users (full_name, email, password_hash, role, status) VALUES
('System Admin', 'admin@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'admin', 'active'),
('John Teacher', 'teacher@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'teacher', 'active'),
('Alice Student', 'student@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'student', 'active'),
('Bob Parent', 'parent@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'parent', 'active'),
('Emily Student', 'emily.student@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'student', 'active'),
('William Parent', 'william.parent@school.com', '$2b$10$phVU4D/Lsn1gA4yq1j7ggeDKn.eH4ZdVJ7cBXVESFQeFj2h.oIXR.', 'parent', 'active');

-- Insert Teachers (3 Teachers)
INSERT INTO teachers (user_id, teacher_code, full_name, email, phone, specialization, degree, hire_date) VALUES
(2, 'TEA001', 'John Teacher', 'teacher@school.com', '0123456789', 'Mathematics', 'Master of Science', '2023-01-15'),
(NULL, 'TEA002', 'Sarah Smith', 'sarah.smith@school.com', '0987654321', 'Physics', 'PhD', '2022-08-20'),
(NULL, 'TEA003', 'Michael Brown', 'michael.brown@school.com', '0111222333', 'English', 'Bachelor of Arts', '2024-02-01');

-- Insert Classes (4 Classes)
INSERT INTO classes (class_code, class_name, grade_level, academic_year, homeroom_teacher_id, room) VALUES
('10A1', 'Class 10A1', '10', '2023-2024', 1, 'Room 101'),
('11B2', 'Class 11B2', '11', '2023-2024', 2, 'Room 205'),
('12C3', 'Class 12C3', '12', '2023-2024', 3, 'Room 309'),
('9D4', 'Class 9D4', '9', '2023-2024', 1, 'Room 004');

-- Insert Students (10 Students)
INSERT INTO students (user_id, student_code, full_name, email, phone, gender, date_of_birth, class_id, admission_date, academic_year) VALUES
(3, 'STU001', 'Alice Student', 'student@school.com', '0222333444', 'female', '2008-05-12', 1, '2023-09-01', '2023-2024'),
(NULL, 'STU002', 'Bob Junior', 'bob.jr@gmail.com', '0333444555', 'male', '2008-11-20', 1, '2023-09-01', '2023-2024'),
(NULL, 'STU003', 'Charlie Brown', 'charlie@gmail.com', '0444555666', 'male', '2007-03-15', 2, '2022-09-01', '2022-2023'),
(NULL, 'STU004', 'David Lee', 'david.lee@gmail.com', '0555666777', 'male', '2006-07-22', 3, '2021-09-01', '2021-2022'),
(5, 'STU005', 'Emily Watson', 'emily.student@school.com', '0666777888', 'female', '2008-01-29', 1, '2023-09-01', '2023-2024'),
(NULL, 'STU006', 'Frank Miller', 'frank.m@gmail.com', '0777888999', 'male', '2008-09-10', 1, '2023-09-01', '2023-2024'),
(NULL, 'STU007', 'Grace Hoang', 'grace.h@gmail.com', '0888999000', 'female', '2007-04-05', 2, '2022-09-01', '2023-2024'),
(NULL, 'STU008', 'Henry Nguyen', 'henry.n@gmail.com', '0999000111', 'male', '2007-06-18', 2, '2022-09-01', '2023-2024'),
(NULL, 'STU009', 'Isabella Garcia', 'isabella.g@gmail.com', '0122333444', 'female', '2006-12-03', 3, '2021-09-01', '2023-2024'),
(NULL, 'STU010', 'Jack Taylor', 'jack.t@gmail.com', '0233444555', 'male', '2006-10-14', 3, '2021-09-01', '2023-2024');

-- Insert Parents (5 Parents)
INSERT INTO parents (user_id, full_name, email, phone, relationship, address) VALUES
(4, 'Bob Parent', 'parent@school.com', '0666777888', 'father', '123 Apple Street, Cupertino'),
(NULL, 'Mary Brown', 'mary.brown@gmail.com', '0777888999', 'mother', '456 Elm Street, San Jose'),
(6, 'William Parent', 'william.parent@school.com', '0888999111', 'father', '789 Maple Avenue, Oakland'),
(NULL, 'Linda Miller', 'linda.miller@gmail.com', '0999111222', 'mother', '321 Pine Road, Berkeley'),
(NULL, 'Helen Hoang', 'helen.hoang@gmail.com', '0111333555', 'mother', '147 Cherry Lane, Palo Alto');

-- Student-Parents mapping
INSERT INTO student_parents (student_id, parent_id, is_primary) VALUES
(1, 1, TRUE), -- Alice Student has Bob Parent
(2, 1, FALSE), -- Bob Junior has Bob Parent
(3, 2, TRUE),  -- Charlie Brown has Mary Brown
(5, 3, TRUE),  -- Emily Watson has William Parent
(6, 4, TRUE),  -- Frank Miller has Linda Miller
(7, 5, TRUE);  -- Grace Hoang has Helen Hoang

-- Insert Subjects (8 Subjects)
INSERT INTO subjects (subject_code, subject_name, description, periods_per_week) VALUES
('MATH', 'Mathematics', 'Core mathematics course including algebra and geometry', 5),
('PHYS', 'Physics', 'Classical mechanics, thermodynamics and electromagnetism', 4),
('CHEM', 'Chemistry', 'Inorganic, organic chemistry and laboratory practices', 4),
('BIO', 'Biology', 'Study of life, genetics, evolution and human anatomy', 3),
('ENG', 'English', 'Language, literature and advanced composition studies', 4),
('HIST', 'History', 'World and national modern and medieval history', 2),
('GEO', 'Geography', 'Physical, political geography and earth sciences', 2),
('IT', 'Information Technology', 'Computer science basics, programming and digital systems', 2);

-- Class-Subjects Mapping
INSERT INTO class_subjects (class_id, subject_id, teacher_id, semester, academic_year) VALUES
(1, 1, 1, 'Semester 1', '2023-2024'),
(1, 2, 2, 'Semester 1', '2023-2024'),
(1, 5, 3, 'Semester 1', '2023-2024'),
(2, 1, 1, 'Semester 1', '2023-2024'),
(2, 3, 2, 'Semester 1', '2023-2024'),
(3, 2, 2, 'Semester 1', '2023-2024'),
(3, 8, 3, 'Semester 1', '2023-2024');

-- Insert Grades
INSERT INTO grades (student_id, class_id, subject_id, teacher_id, semester, academic_year, oral_score, quiz_score, test_score, midterm_score, final_score, average_score, grade_letter) VALUES
(1, 1, 1, 1, 'Semester 1', '2023-2024', 9.0, 8.5, 8.0, 8.5, 9.0, 8.6, 'A'),
(2, 1, 1, 1, 'Semester 1', '2023-2024', 7.0, 7.5, 6.5, 7.0, 7.5, 7.1, 'B'),
(5, 1, 1, 1, 'Semester 1', '2023-2024', 8.5, 9.0, 8.5, 9.0, 9.5, 9.0, 'A'),
(6, 1, 1, 1, 'Semester 1', '2023-2024', 6.0, 5.5, 6.0, 5.0, 6.5, 5.9, 'C');

-- Insert Attendance
INSERT INTO attendance (student_id, class_id, date, status, check_in_time, note) VALUES
(1, 1, '2024-05-16', 'present', '07:15:00', 'Arrived on time'),
(2, 1, '2024-05-16', 'late', '07:45:00', 'Traffic delay'),
(5, 1, '2024-05-16', 'present', '07:20:00', 'Arrived on time'),
(6, 1, '2024-05-16', 'absent', NULL, 'Sick leave'),
(1, 1, '2024-05-17', 'present', '07:10:00', 'Arrived on time'),
(2, 1, '2024-05-17', 'present', '07:25:00', 'Arrived on time'),
(5, 1, '2024-05-17', 'present', '07:15:00', 'Arrived on time'),
(6, 1, '2024-05-17', 'excused', NULL, 'Medical appointment');

-- Insert Payments
INSERT INTO payments (invoice_code, student_id, payment_type, amount, due_date, paid_date, status, description) VALUES
('INV-2024-001', 1, 'tuition', 5000000.00, '2024-06-01', NULL, 'unpaid', 'Tuition Fees for Semester 2'),
('INV-2024-002', 2, 'tuition', 5000000.00, '2024-06-01', '2024-05-10', 'paid', 'Tuition Fees for Semester 2'),
('INV-2024-003', 5, 'tuition', 5000000.00, '2024-06-01', NULL, 'unpaid', 'Tuition Fees for Semester 2'),
('INV-2024-004', 6, 'tuition', 5000000.00, '2024-06-01', '2024-05-12', 'paid', 'Tuition Fees for Semester 2');

-- Insert Notifications
INSERT INTO notifications (title, content, sender_id, audience_type, priority) VALUES
('Welcome to StudentOS', 'We are excited to launch our new student management system!', 1, 'all', 'normal'),
('Final Exam Schedule', 'Please check the examination schedule in the documents section.', 1, 'class', 'important'),
('Parent-Teacher Meeting', 'The upcoming parent-teacher meeting is scheduled for next Saturday at 8:30 AM.', 1, 'parent', 'urgent');

-- Insert Schedules
INSERT INTO schedules (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, semester, academic_year) VALUES
(1, 1, 1, 'monday', '08:00:00', '09:30:00', 'Room 101', 'Semester 1', '2023-2024'),
(1, 2, 2, 'monday', '09:45:00', '11:15:00', 'Room 101', 'Semester 1', '2023-2024'),
(1, 5, 3, 'tuesday', '08:00:00', '09:30:00', 'Room 101', 'Semester 1', '2023-2024'),
(2, 1, 1, 'wednesday', '08:00:00', '09:30:00', 'Room 205', 'Semester 1', '2023-2024');

-- Default application settings
INSERT INTO settings (setting_key, setting_value, category, description) VALUES
('school_name', 'Trường THPT StudentOS', 'general', 'Tên trường học'),
('school_code', 'SOS-001', 'general', 'Mã trường'),
('school_address', '123 Apple Way, Cupertino, CA', 'general', 'Địa chỉ trường'),
('current_academic_year', '2025-2026', 'academic', 'Năm học hiện tại'),
('default_semester', 'Semester 1', 'academic', 'Học kỳ mặc định'),
('password_min_length', '8', 'system', 'Độ dài mật khẩu tối thiểu');
