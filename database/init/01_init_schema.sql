-- Không áp dụng nữa: schema chuyển sang EF Core Migration; giữ file làm tài liệu lịch sử của nhóm.
-- ==============================================================================
-- EVENTPASS DATABASE INITIALIZATION SCRIPT (PostgreSQL 16 + pgvector)
-- Nhóm: 262701-DACN-18-Nhom1A | GVHD: ThS. Trần Đình Nghĩa (SGU)
-- ==============================================================================

-- 1. Kích hoạt tiện ích mở rộng pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Bảng Users (Tài khoản người dùng & Quyền hạn)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role INT NOT NULL DEFAULT 0, -- 0: User/Attendee, 1: Organizer, 2: Admin
    face_vector VECTOR(512),     -- Vector khuôn mặt cá nhân lúc nạp hồ sơ (UC05)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Bảng Events (Sự kiện & Chuỗi thời gian)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    organizer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    location VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status INT NOT NULL DEFAULT 0, -- 0: Draft, 1: Published, 2: Closed, 3: Completed, 4: Cancelled
    is_face_recognition_enabled BOOLEAN DEFAULT TRUE,
    is_qr_enabled BOOLEAN DEFAULT TRUE,
    event_images TEXT, -- JSON array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Bảng Tickets (Các phân hạng vé của sự kiện: VIP, Standard, v.v.)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    quantity_sold INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Bảng Orders (Đơn đặt vé & Giao dịch thanh toán)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    status INT NOT NULL DEFAULT 0, -- 0: Pending, 1: Paid, 2: Cancelled, 3: Expired
    payment_method VARCHAR(50) DEFAULT 'VietQR',
    transaction_id VARCHAR(100),
    order_code VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Bảng TicketDetails (Từng tấm vé cụ thể được cấp phát cho người tham dự)
CREATE TABLE IF NOT EXISTS ticket_details (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    ticket_code VARCHAR(100) NOT NULL UNIQUE,
    qr_code_url TEXT,
    attendee_name VARCHAR(255) NOT NULL,
    attendee_email VARCHAR(255) NOT NULL,
    attendee_phone VARCHAR(50),
    attendee_face_data TEXT, -- Metadata ảnh chân dung
    face_vector VECTOR(512), -- Vector đặc trưng 512 chiều từ Facenet512 (Đối soát Kiosk < 1s)
    status INT NOT NULL DEFAULT 0, -- 0: Valid/Chưa vào, 1: CheckedIn/Đã vào, 2: Cancelled
    checked_in_at TIMESTAMP WITH TIME ZONE,
    ticket_images TEXT, -- JSON array of photos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 7. Bảng CheckinLogs (Nhật ký kiểm toán thời gian thực - NFR17 Audit Trail)
CREATE TABLE IF NOT EXISTS checkin_logs (
    id SERIAL PRIMARY KEY,
    ticket_detail_id INT REFERENCES ticket_details(id) ON DELETE SET NULL,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    kiosk_name VARCHAR(100) DEFAULT 'Kiosk Cổng 1',
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    match_distance FLOAT,
    face_confidence FLOAT,
    status VARCHAR(50) NOT NULL, -- 'VALID', 'DUPLICATE', 'SPOOF_DETECTED', 'NOT_FOUND'
    notes TEXT
);

-- ==============================================================================
-- 8. TẠO CHỈ MỤC HNSW (HIERARCHICAL NAVIGABLE SMALL WORLD) CHO PGVECTOR
-- Phép đo: vector_cosine_ops (Cosine Distance <=> để tìm kiếm 1:N trong < 15ms)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ticket_details_face_vector 
ON ticket_details USING hnsw (face_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_users_face_vector 
ON users USING hnsw (face_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Chỉ mục hỗ trợ tra cứu mã vé siêu tốc
CREATE INDEX IF NOT EXISTS idx_ticket_details_code ON ticket_details(ticket_code);
CREATE INDEX IF NOT EXISTS idx_ticket_details_event ON ticket_details(event_id, status);
