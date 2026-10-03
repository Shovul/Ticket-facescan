# 🎫 EventPass — Nền Tảng Quản Lý & Điểm Danh Sự Kiện Bằng Khuôn Mặt (Face ID)

EventPass là hệ sinh thái quản lý sự kiện, phân phối vé điện tử và kiểm soát ra vào tự động bằng nhận diện sinh trắc học khuôn mặt qua cổng Kiosk theo thời gian thực.

---

## 🏛️ Kiến Trúc Tổng Thể (System Architecture)

Hệ thống được xây dựng theo mô hình **Hybrid Architecture: Modular Monolith kết hợp AI Microservice**, quản lý mã nguồn tập trung dưới dạng **Monorepo**:

* **Frontend:** Next.js 14+ (App Router), TypeScript, TailwindCSS.
* **Backend Core:** ASP.NET Core 8 Web API (.NET 8) theo kiến trúc **Clean Architecture** (Domain, Application, Infrastructure, API). Tích hợp **SignalR** cho dữ liệu thời gian thực.
* **AI Service:** FastAPI (Python), sử dụng DeepFace & OpenCV để trích xuất và đối soát vector khuôn mặt.
* **Cơ sở dữ liệu:** PostgreSQL kết hợp tiện ích mở rộng **`pgvector`** để lưu trữ và tìm kiếm vector nhúng sinh trắc học trực tiếp.
* **Cổng thanh toán:** Tích hợp Webhook VietQR (SePay / PayOS) xử lý giao dịch tự động.

---

## 📂 Cấu Trúc Thư Mục (Monorepo Layout)

```text
eventpass/
├── .github/                      # CI/CD Workflows (GitHub Actions)
│   └── workflows/
│       ├── deploy-frontend.yml
│       ├── deploy-backend.yml
│       └── deploy-ai.yml
│
├── frontend/                     # Next.js 14+ Client & Admin Dashboard
│   ├── public/                   # Tài nguyên tĩnh, logo, icon
│   └── src/
│       ├── app/
│       │   ├── (auth)/           # Đăng nhập, đặt lại mật khẩu
│       │   ├── (customer)/       # Cổng mua vé, Face ID người dùng
│       │   ├── admin/            # Dashboard, Quản lý sự kiện, Đối soát VietQR
│       │   └── kiosk/            # Giao diện camera quét mặt tại cổng sự kiện
│       ├── components/           # UI Reusable Components
│       ├── hooks/                # Custom React Hooks (useSignalR, useDebounce)
│       ├── services/             # Axios API Client gọi về .NET Core
│       └── types/                # TypeScript Interfaces & Models
│
├── backend-core/                 # ASP.NET Core 8 Web API
│   ├── src/
│   │   ├── EventPass.Domain/     # Thực thể nghiệp vụ (Entities, Enums)
│   │   ├── EventPass.Application/# Logic ứng dụng, DTOs, HTTP Client gọi AI Service
│   │   ├── EventPass.Infrastructure/ # EF Core, PostgreSQL pgvector, Webhook VietQR
│   │   └── EventPass.API/        # RESTful Controllers, SignalR Hubs, Middlewares
│   └── EventPass.sln
│
├── ai-service/                   # FastAPI Python (DeepFace Microservice)
│   └── app/
│       ├── api/v1/endpoints/     # Endpoint trích xuất vector khuôn mặt (/extract, /verify)
│       ├── core/                 # Cấu hình ngưỡng threshold, bảo mật API Key
│       └── services/             # Tiền xử lý ảnh, tải mô hình ArcFace/Facenet
│
├── database/                     # Scripts khởi tạo PostgreSQL & pgvector
│   └── init/
│       ├── 01_init_extensions.sql
│       └── 02_seed_data.sql
│
├── docker-compose.yml            # Điều phối toàn bộ dịch vụ
├── .env.example                  # Mẫu biến môi trường
└── README.md
```

---

## 🚀 Các Phân Hệ & Use Cases Cốt Lõi

### 👤 Khách hàng (Customer)

* Đăng ký, đăng nhập và liên kết tài khoản Google.
* Khám phá sự kiện, chọn phân hạng vé và thanh toán qua mã VietQR động.
* Cập nhật hồ sơ cá nhân và tải ảnh khuôn mặt (Face ID) để trích xuất vector nhúng.

### 🛡️ Quản trị viên (Admin)

* **Live Dashboard (UC10):** Theo dõi số lượng check-in, tỷ lệ lấp đầy, lưu lượng theo khung giờ và Live Feed qua SignalR.
* **Khởi tạo sự kiện (UC11):** Cấu hình chuỗi 5 mốc thời gian, pháp lý đơn vị, phân hạng vé, cấp Secret Token cho Kiosk và xuất bản trực tiếp.
* **Quản trị sự kiện (UC12):** Quản lý chi tiết sự kiện, trạm soát vé, mẫu vé điện tử và điều phối đóng/mở/hủy sự kiện.
* **Danh sách tham dự & Đối soát (UC13):** Tra cứu khách vé, xem ảnh đối chiếu Face ID, điểm danh thủ công, khóa/mở khóa vé linh hoạt và xuất file báo cáo.
* **Theo dõi dòng tiền VietQR (UC14):** Giám sát giao dịch ngân hàng theo thời gian thực qua Webhook SePay/PayOS, phân trang đối soát cố định 06 giao dịch/trang.

### 📷 Trạm kiểm soát (Kiosk)

* Xác thực trạm camera bằng Secret Token độc bản.
* Quét khuôn mặt tự động với thời gian phản hồi ≤ 1 giây, kiểm tra tính hợp lệ và gửi tín hiệu mở cổng.

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

### Yêu cầu tiên quyết

* Docker & Docker Compose
* .NET 8 SDK
* Node.js (v18.x trở lên)
* Python (3.10 trở lên)

### Khởi chạy nhanh bằng Docker Compose

**1. Clone repository:**

```bash
git clone https://github.com/DoctorFear/Ticket-facescan.git
cd Ticket-facescan
git checkout project
```

**2. Cấu hình biến môi trường:**

```bash
cp .env.example .env
```

**3. Khởi động toàn bộ dịch vụ:**

```bash
docker-compose up --build -d
```

Hệ thống sẽ chạy tại các cổng mặc định:

| Dịch vụ | Địa chỉ |
|---|---|
| Frontend Web | http://localhost:3000 |
| Backend API Swagger | http://localhost:5000/swagger |
| AI Service OpenAPI Docs | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` |

---

## 🔐 Bảo Mật & Lưu Trữ Dữ Liệu Khuôn Mặt

* Hệ thống chỉ lưu trữ **vector nhúng đặc trưng khuôn mặt (Embedding Vector)** trong cơ sở dữ liệu qua tiện ích mở rộng `pgvector`.
* File ảnh gốc của người dùng được kiểm tra tính hợp lệ, trích xuất dữ liệu toán học và xóa bỏ hoặc lưu trữ biệt lập nhằm đảm bảo quyền riêng tư.
* Giao tiếp giữa các trạm Kiosk và máy chủ trung tâm được mã hóa bằng Secret Token độc bản.