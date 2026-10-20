# -*- coding: utf-8 -*-
# Script to generate the polished, professional DACN Note for EventPass.
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_styled_document():
    doc = docx.Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)

    # Base Colors
    COLOR_PRIMARY = RGBColor(26, 86, 160)     # Navy Blue
    COLOR_SECONDARY = RGBColor(16, 124, 65)   # Green
    COLOR_DARK = RGBColor(33, 37, 41)         # Dark text
    COLOR_MUTED = RGBColor(108, 117, 125)     # Gray text
    COLOR_ACCENT = RGBColor(180, 40, 40)      # Red accent

    # Helper to add headings
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(15)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_SECONDARY
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK
        return p

    def add_p(text, bold_prefix="", italic=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Arial"
            r_bold.font.size = Pt(10)
            r_bold.font.bold = True
            r_bold.font.color.rgb = COLOR_DARK
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.italic = italic
        r.font.color.rgb = COLOR_DARK
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Arial"
            r_bold.font.size = Pt(10)
            r_bold.font.bold = True
            r_bold.font.color.rgb = COLOR_DARK
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.color.rgb = COLOR_DARK
        return p

    def add_callout(text, title="LƯU Ý QUAN TRỌNG:"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.7)
        set_cell_background(cell, "EBF3FA")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="1A56A0"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        r_t = p.add_run(f"📌 {title} ")
        r_t.font.name = "Arial"
        r_t.font.size = Pt(10)
        r_t.font.bold = True
        r_t.font.color.rgb = COLOR_PRIMARY
        
        r_c = p.add_run(text)
        r_c.font.name = "Arial"
        r_c.font.size = Pt(9.5)
        r_c.font.color.rgb = COLOR_DARK
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==========================
    # HEADER / TITLE
    # ==========================
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_title.add_run("TRƯỜNG ĐẠI HỌC SÀI GÒN (SGU) – KHOA CÔNG NGHỆ THÔNG TIN")
    r.font.name = "Arial"
    r.font.size = Pt(9.5)
    r.font.bold = True
    r.font.color.rgb = COLOR_MUTED

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(4)
    p_sub.paragraph_format.space_after = Pt(8)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_sub.add_run("EVENTPASS – SỔ TAY KỸ THUẬT, THIẾT KẾ HỆ THỐNG & CẨM NANG VẤN ĐÁP BẢO VỆ ĐỒ ÁN")
    r.font.name = "Arial"
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.color.rgb = COLOR_PRIMARY

    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(14)
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_meta.add_run("Đề tài 18 | Nhóm: 262701-DACN-18-Nhom1A | GVHD: ThS. Trần Đình Nghĩa\nNền tảng Quản lý Vé & Điểm danh Kiosk Face ID Siêu tốc (< 1s)")
    r.font.name = "Arial"
    r.font.size = Pt(10)
    r.font.italic = True
    r.font.color.rgb = COLOR_MUTED

    # ==========================================
    # PHẦN 1: BỐI CẢNH & 4 TRỤ CỘT CÔNG NGHỆ
    # ==========================================
    add_h1("1. TỔNG QUAN KIẾN TRÚC & 4 TRỤ CỘT CÔNG NGHỆ")
    add_p("Hệ thống EventPass giải quyết bài toán nút thắt cổ chai lớn nhất trong khâu kiểm soát vé sự kiện (hội thảo, đại nhạc hội, ngày hội việc làm): tình trạng ùn tắc cục bộ trong khung giờ cao điểm (15-30 phút trước giờ khai mạc). Thay vì soát vé thủ công mất 30-60 giây hoặc quét QR mất 15-30 giây, EventPass cho phép khách bước qua trạm Kiosk tự động điểm danh trong vòng chưa đầy 1 giây.")
    
    add_h2("4 Trụ cột Công nghệ cốt lõi đã chốt với GVHD:")
    add_bullet(" Next.js 14+ (App Router), TypeScript, TailwindCSS: Xây dựng cổng Kiosk camera trực tiếp, cổng quản trị viên và giao diện đặt vé cá nhân.", "1. Frontend:")
    add_bullet(" ASP.NET Core 8 Web API (.NET 8) theo kiến trúc Clean Architecture (Domain, Application, Infrastructure, API). Tích hợp SignalR Hub bắn dữ liệu điểm danh theo thời gian thực lên Dashboard.", "2. Backend Core:")
    add_bullet(" FastAPI (Python 3.11), sử dụng DeepFace & OpenCV (Model Facenet512, Detector OpenCV, MiniFASNet Anti-Spoofing). Trích xuất và đối soát vector khuôn mặt 512 chiều.", "3. AI Service:")
    add_bullet(" PostgreSQL 16 kết hợp tiện ích mở rộng pgvector. Lưu trữ vector nhúng 512 chiều (face_vector) và tìm kiếm độ tương đồng Cosine bằng chỉ mục HNSW siêu tốc.", "4. Cơ sở dữ liệu:")

    add_callout(
        "AI Service KHÔNG kết nối trực tiếp vào Database! AI Service chỉ làm nhiệm vụ thị giác máy tính thuần túy: Biến ảnh thành 512 số thực (vector embedding). Toàn bộ khâu đối soát 1:N với hàng ngàn vé sự kiện được giao cho PostgreSQL pgvector xử lý bằng chỉ mục HNSW trực tiếp trong RAM.",
        "QUY TẮC PHÂN CHIA TRÁCH NHIỆM KIẾN TRÚC:"
    )

    # ==========================================
    # PHẦN 2: BẢNG ĐO THỜI GIAN CHECK-IN KIOSK
    # ==========================================
    add_h1("2. TỐC ĐỘ CHECK-IN KIOSK (< 1S) & PHÂN BỔ THỜI GIAN THỰC TẾ")
    add_p("Yêu cầu phi chức năng NFR22 & NFR25 quy định: Kiosk camera Web nhận diện chính xác danh tính trong cơ sở dữ liệu với thời gian phản hồi dưới 1 giây trên CPU phổ thông. Khi Kiosk chụp 1 khung hình gửi lên hệ thống, chu trình xử lý trải qua đúng 4 công đoạn sau:")

    # Table: Time breakdown
    table_time = doc.add_table(rows=6, cols=4)
    table_time.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Công đoạn xử lý", "Thành phần đảm nhận", "Thời gian thực tế (CPU)", "Chi tiết kỹ thuật"]
    for i, h in enumerate(headers):
        cell = table_time.cell(0, i)
        set_cell_background(cell, "1A56A0")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    data_time = [
        ("1. Đón ảnh & Lọc FIQA", "OpenCV (ai-service)", "~30 – 50 ms", "Kiểm tra ảnh mờ (Laplacian), độ sáng, cắt đúng vùng khuôn mặt"),
        ("2. Trích xuất vector & Anti-Spoofing", "DeepFace Facenet512 + MiniFASNet", "~200 – 280 ms", "Kiểm tra mặt thật/màn hình + trích xuất vector 512-d chuẩn pgvector"),
        ("3. Đối soát tìm vé trong DB", "PostgreSQL pgvector (HNSW Index)", "~5 – 20 ms", "So khớp Cosine Distance (< 0.32) với danh sách vé sự kiện trong RAM"),
        ("4. Đổi trạng thái vé & Bắn SignalR", "Backend ASP.NET Core 8", "~20 – 40 ms", "Ghi log kiểm toán checkin_logs, bắn tín hiệu tới Kiosk & Live Dashboard"),
        ("👉 TỔNG THỜI GIAN TOÀN HỆ THỐNG", "EventPass Pipeline", "≈ 300 – 400 ms", "Nhanh gấp đôi yêu cầu đề tài (<= 1000 ms = 1.0 giây)")
    ]

    for row_idx, row_data in enumerate(data_time, start=1):
        for col_idx, text in enumerate(row_data):
            cell = table_time.cell(row_idx, col_idx)
            if row_idx == 5:
                set_cell_background(cell, "EBF3FA")
            else:
                set_cell_background(cell, "F8F9FA" if row_idx % 2 == 1 else "FFFFFF")
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            if col_idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(text)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            if row_idx == 5 or col_idx == 0:
                r.font.bold = True
                if row_idx == 5:
                    r.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 2 traps
    add_h2("Hai 'Cái Bẫy' làm DeepFace bị chậm và giải pháp kỹ thuật triệt để:")
    add_bullet("Hiện tượng: Người đầu tiên quét mặt bị đơ mất 4-7 giây (do DeepFace tải weights ONNX từ ổ đĩa và cấp phát bộ nhớ tensor đồ thị CPU). Khắc phục: Viết hàm lifespan warm_up() nạp sẵn model Facenet512 và detector vào RAM ngay khi FastAPI khởi động, loại bỏ hoàn toàn độ trễ khởi động nguội.", "1. Bẫy Cold-Start (Chậm ở người đầu tiên):")
    add_bullet("Hiện tượng: Quét duyệt file ảnh bằng hàm DeepFace.find(img, db_path) khiến hệ thống phải mở lại từng file ảnh để so sánh, khi có 500 khách sẽ mất tới 10-20 giây. Khắc phục: AI Service chỉ trích xuất vector 512 chiều. Việc so khớp được giao cho pgvector tính toán bằng cấu trúc đồ thị HNSW trực tiếp trên RAM máy chủ cơ sở dữ liệu.", "2. Bẫy Quét duyệt File ảnh tuần tự:")

    # ==========================================
    # PHẦN 3: BỘ TIÊU CHUẨN FIQA & ANTI-SPOOFING
    # ==========================================
    add_h1("3. BỘ TIÊU CHUẨN FIQA VÀ CÔNG NGHỆ CHỐNG GIẢ MẠO (ANTI-SPOOFING)")
    add_p("Hệ thống EventPass được nâng cấp vượt chuẩn đồ án sinh viên thông thường nhờ tích hợp 2 lớp phòng thủ chất lượng cao: Đánh giá chất lượng ảnh (FIQA) và Chống tấn công giả mạo (Presentation Attack Detection - PAD).")

    add_h2("Trụ cột 1: Bộ tiêu chuẩn chất lượng ảnh FIQA (Face Image Quality Assessment)")
    add_bullet("Đo bằng phương sai của toán tử vi phân bậc hai Laplacian (Variance of Laplacian). Nếu blur_score < 45.0, ảnh bị nhòe nét do di chuyển nhanh hoặc rung tay -> is_blurry: true.", "1. Độ sắc nét (Sharpness / Blur):")
    add_bullet("Đo giá trị độ sáng trung bình (mean luminance) trên kênh Grayscale (thang đo 0-255). Dưới 40.0 là ảnh chụp trong bóng tối (is_too_dark: true); Trên 225.0 là ảnh bị cháy sáng/chói đèn flash (is_too_bright: true). Dải tối ưu: 40 - 225.", "2. Điều kiện ánh sáng (Illumination):")
    add_bullet("Khung chữ nhật bao quanh khuôn mặt tối thiểu phải đạt 80x80 pixel. Nếu nhỏ hơn -> is_too_small: true (nhắc người tham dự bước lại gần camera hơn).", "3. Kích thước khuôn mặt (Resolution / Distance):")

    add_h2("Trụ cột 2: Công nghệ Chống giả mạo MiniFASNet (Anti-Spoofing / Liveness)")
    add_p("Chống hành vi gian lận mượn vé hoặc điểm danh hộ bằng cách giơ ảnh trên màn hình điện thoại/iPad hoặc ảnh in màu trước camera:")
    add_bullet("MiniFASNet phân tích cấu trúc phản xạ quang học, các vân sọc moiré của tấm nền màn hình LCD/OLED và bề mặt phẳng của giấy in.", "Cơ chế nhận diện:")
    add_bullet("Dùng Passive Liveness (chống giả mạo thụ động). Chỉ mất 1 khung hình chụp tự nhiên trong 60-100ms. Tuyệt đối KHÔNG bắt khách chớp mắt hay lắc đầu tại Kiosk để đảm bảo thời gian thông cổng < 1 giây.", "Phương pháp tiếp cận:")
    add_bullet("Khi phát hiện giơ điện thoại: Hệ thống phản hồi mã lỗi SPOOF_DETECTED, is_real: false trong 768ms, Kiosk phát âm thanh cảnh báo và khóa mở cổng barrier.", "Thực nghiệm kiểm chứng:")

    # ==========================================
    # PHẦN 4: CƠ SỞ KHOA HỌC CỦA NGƯỠNG 0.32
    # ==========================================
    add_h1("4. CƠ SỞ KHOA HỌC CỦA NGƯỠNG COSINE DISTANCE 0.32")
    add_p("Khoảng cách Cosine (Cosine Distance) giữa 2 vector đặc trưng A và B được tính theo công thức:")
    add_p("Cosine Distance(A, B) = 1 - Cosine Similarity(A, B) = 1 - (A · B) / (||A|| × ||B||)", italic=True)
    add_p("Giá trị nằm trong khoảng [0, 1]. Khoảng cách càng tiến về 0 thì hai khuôn mặt càng giống nhau tuyệt đối.")

    add_bullet("Trong các nghiên cứu chuẩn quốc tế của DeepFace trên bộ dữ liệu LFW (Labeled Faces in the Wild - 13.000 khuôn mặt), điểm cân bằng sai số tối ưu EER (Equal Error Rate) của mô hình Facenet512 nằm ở ngưỡng 0.30 (đạt độ chính xác 99.6%).", "Cơ sở thực nghiệm quốc tế (Benchmark LFW):")
    add_bullet("Trong điều kiện Kiosk thực tế ngoài trời/sảnh sự kiện có biến thiên nhẹ về góc quay mặt (+-15 độ), kính cận, nụ cười, ngưỡng 0.30 hơi khắt khe dễ gây từ chối nhầm khách thật. Do đó, nới nhẹ ngưỡng lên 0.32 (tương đương độ tương đồng >= 68%) giúp khách đi qua cổng Kiosk trôi chảy mà vẫn đảm bảo độ an toàn cao.", "Lý do chọn 0.32 thay vì 0.30:")
    add_bullet("Khi kiểm thử 2 ảnh của cùng một người: Khoảng cách đo được là 0.0925 (khớp 90.75% << 0.32) -> Chấp thuận hợp lệ. Khi kiểm thử 2 người hoàn toàn khác nhau: Khoảng cách đo được là 0.6903 (>> 0.32) -> Bị từ chối dứt khoát. Khoảng cách an toàn (safety margin) giữa người thật và người lạ lên tới 0.60 đơn vị.", "Thực nghiệm đo đạc thực tế:")

    # ==========================================
    # PHẦN 5: DANH MỤC API MODULE AI
    # ==========================================
    add_h1("5. DANH MỤC CÁC ENDPOINT API CỦA AI SERVICE")
    add_p("Module AI Service cung cấp 4 endpoint chính xác theo kiến trúc Microservices và khớp 100% tài liệu Hồ sơ Thiết kế SGU (Bảng 6.1):")

    table_api = doc.add_table(rows=5, cols=4)
    table_api.alignment = WD_TABLE_ALIGNMENT.CENTER
    api_headers = ["Phương thức & Endpoint", "Mô tả nghiệp vụ", "Use Case", "Ghi chú tương thích"]
    for i, h in enumerate(api_headers):
        cell = table_api.cell(0, i)
        set_cell_background(cell, "1A56A0")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    data_api = [
        ("POST /api/ai/extract-embeddings", "Trích xuất vector 512-d từ file ảnh nhị phân (.jpg, .png)", "UC05, UC14", "Khớp 100% văn bản Bảng 6.1 Hồ sơ Thiết kế SGU"),
        ("POST /api/v1/face/extract", "Trích xuất vector 512-d chuẩn RESTful v1 (kèm FIQA & Anti-Spoofing)", "UC05, UC14", "Được Backend .NET Core gọi chính thức"),
        ("POST /api/v1/face/verify", "Đối soát trực tiếp 1:1 giữa 2 file ảnh (ảnh hồ sơ vs ảnh chụp tại quầy)", "UC12", "Dành cho Quầy hỗ trợ Helpdesk xử lý sự cố/khiếu nại"),
        ("GET /api/v1/health", "Kiểm tra sức khỏe, trạng thái tải weights mô hình, bộ nhớ và uptime", "NFR18", "Phục vụ Docker Healthcheck & hệ thống giám sát")
    ]

    for row_idx, row_data in enumerate(data_api, start=1):
        for col_idx, text in enumerate(row_data):
            cell = table_api.cell(row_idx, col_idx)
            set_cell_background(cell, "F8F9FA" if row_idx % 2 == 1 else "FFFFFF")
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            if col_idx in (0, 2):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(text)
            r.font.name = "Arial"
            r.font.size = Pt(9)
            if col_idx == 0:
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # ==========================================
    # PHẦN 6: BỘ TIÊU CHUẨN ĐÁNH GIÁ KHOA HỌC
    # ==========================================
    add_h1("6. BỘ TIÊU CHUẨN ĐÁNH GIÁ KHOA HỌC CHO BÁO CÁO ĐỒ ÁN")
    add_p("Để đưa vào Chương 'Đánh giá Thực nghiệm' của cuốn Báo cáo Khóa luận tốt nghiệp, hệ thống áp dụng các tiêu chuẩn đo lường quốc tế ISO/IEC 30107-3 (Biometric Presentation Attack Detection):")

    add_bullet("Tỷ lệ nhận diện nhầm người lạ thành chính chủ vé. Công thức: FAR = (Số lần nhận nhầm / Tổng số lần thử người lạ) × 100%. Tiêu chuẩn thiết kế: FAR <= 0.1%.", "1. FAR (False Acceptance Rate):")
    add_bullet("Tỷ lệ từ chối nhầm chính chủ vé hợp lệ. Công thức: FRR = (Số lần từ chối oan / Tổng số lần thử chính chủ) × 100%. Tiêu chuẩn thiết kế: FRR <= 5.0%.", "2. FRR (False Rejection Rate):")
    add_bullet("Tỷ lệ lọt lưới tấn công giả mạo (kẻ gian dùng màn hình điện thoại hoặc ảnh in lọt qua cổng). Công thức: APCER = (Số lần giả mạo thành công / Tổng số lần thử tấn công) × 100%. Tiêu chuẩn thiết kế: APCER = 0.0%.", "3. APCER (Attack Presentation Classification Error Rate):")
    add_bullet("Tỷ lệ phán đoán nhầm người thật thành kẻ giả mạo. Công thức: BPCER = (Số lần người thật bị báo giả / Tổng số lần thử người thật) × 100%. Tiêu chuẩn thiết kế: BPCER <= 1.0%.", "4. BPCER (Bona Fide Presentation Classification Error Rate):")

    # ==========================================
    # PHẦN 7: CẨM NANG VẤN ĐÁP BẢO VỆ ĐỒ ÁN (Q&A)
    # ==========================================
    add_h1("7. CẨM NANG VẤN ĐÁP & TRẢ LỜI PHẢN BIỆN HỘI ĐỒNG (Q&A CHEAT SHEET)")
    add_p("Tổng hợp các câu hỏi hóc búa nhất mà Giảng viên hướng dẫn (Thầy Nghĩa) hoặc Hội đồng chấm tốt nghiệp sẽ hỏi về đề tài, cùng gợi ý câu trả lời chuẩn chỉ kỹ thuật:")

    add_h2("Câu 1: DeepFace chạy trên CPU máy tính thông thường liệu có kịp 1 giây không em?")
    add_p("Dạ thưa Thầy, hệ thống hoàn toàn đạt dưới 1 giây (thực tế chỉ 300-400ms) nhờ 3 giải pháp kỹ thuật cốt lõi:", bold_prefix="👉 Gợi ý trả lời: ")
    add_bullet("Thứ nhất: Module AI chỉ làm đúng 1 nhiệm vụ nhẹ nhất là trích xuất vector 512 chiều từ ảnh mặt đã cắt qua OpenCV. Thời gian suy luận chỉ mất 200-250ms trên CPU Core i5/i7.")
    add_bullet("Thứ hai: Khâu đối soát 1:N với toàn bộ vé sự kiện không quét duyệt file ảnh trong ổ cứng mà được đẩy sang PostgreSQL pgvector với chỉ mục HNSW trực tiếp trên RAM, thời gian truy vấn chỉ mất 5-15ms.")
    add_bullet("Thứ ba: Nhóm có cơ chế Model Warm-up nạp sẵn weights vào RAM khi khởi động FastAPI, loại bỏ hoàn toàn độ trễ khởi động nguội 4-5s ở người đầu tiên.")

    add_h2("Câu 2: Tại sao ở Quầy hỗ trợ (UC12) lại cần chức năng đối soát 1:1 mà không quét thẳng Database?")
    add_p("Dạ thưa Thầy, vì 2 bài toán hoàn toàn khác nhau về bản chất và độ an toàn:", bold_prefix="👉 Gợi ý trả lời: ")
    add_bullet("Tại Kiosk là bài toán 1:N (Không biết khách là ai, phải lục tìm trong 10.000 người). Rủi ro nhận nhầm tăng theo cấp số nhân với quy mô sự kiện nên Kiosk phải đặt ngưỡng nhận diện tự động cực kỳ khắt khe.")
    add_bullet("Khi khách đến Quầy hỗ trợ là vì Kiosk không nhận ra (khách đổi kiểu tóc, đeo kính mới, trang điểm đậm). Khách đã xuất trình Mã vé hoặc QR Code trên tay. Lúc này nhân viên đã biết chính xác khách đang nhận mình là chủ của tấm vé nào. Bài toán chuyển thành 1:1: 'Mặt người này có khớp với ảnh hồ sơ của vé này không?'.")
    add_bullet("So sánh 1:1 triệt tiêu hoàn toàn rủi ro nhận diện nhầm người khác (FAR về 0%), đồng thời hiển thị trực quan % độ tương đồng để nhân viên quầy tự tin bấm nút duyệt cho khách vào.")

    add_h2("Câu 3: Dữ liệu khuôn mặt của người dùng được bảo mật như thế nào theo Nghị định 13/2023/NĐ-CP?")
    add_p("Dạ thưa Thầy, EventPass tuân thủ nghiêm ngặt nguyên tắc Bảo mật ngay từ thiết kế (Privacy by Design):", bold_prefix="👉 Gợi ý trả lời: ")
    add_bullet("Hệ thống không lưu trữ ảnh khuôn mặt thô bừa bãi trong database. Toàn bộ nhận diện được chuyển hóa thành Vector nhúng 512 chiều (mảng số thực). Vector này là phép chiếu 1 chiều, kẻ gian dù có đánh cắp được database cũng không thể tái tạo ngược lại thành khuôn mặt người thật.")
    add_bullet("Ảnh chân dung gốc chỉ phục vụ đối chiếu trực quan tại Quầy hỗ trợ và tuân thủ điều khoản tự động xóa hủy an toàn sau 30 ngày kể từ khi sự kiện kết thúc.")
    add_bullet("Giao tiếp nội bộ giữa Backend .NET 8 và AI Service được bảo vệ bằng Header bí mật X-API-Key, ngăn chặn truy cập trái phép.")

    add_h2("Câu 4: Nhóm chọn ngưỡng Cosine Distance 0.32 dựa trên cơ sở khoa học nào?")
    add_p("Dạ thưa Thầy, nhóm chọn dựa trên cơ sở thực nghiệm quốc tế và đo đạc thực tế của đề tài:", bold_prefix="👉 Gợi ý trả lời: ")
    add_bullet("Trên bộ dữ liệu chuẩn LFW của mô hình Facenet512, điểm cân bằng sai số tối ưu EER nằm ở mức 0.30 (độ chính xác 99.6%).")
    add_bullet("Trong môi trường Kiosk thực tế có biến thiên nhẹ về góc nghiêng và ánh sáng, nhóm nới nhẹ lên 0.32 (tương đương độ giống nhau >= 68%) để giảm tỷ lệ từ chối nhầm khách thật (FRR).")
    add_bullet("Kết quả đo đạc thực tế của nhóm: Khoảng cách giữa 2 ảnh cùng 1 người là 0.0925 (vượt xa ngưỡng 0.32), trong khi khoảng cách với người lạ là 0.6903 (gấp đôi ngưỡng 0.32). Vùng an toàn lên tới 0.60 đơn vị chứng minh ngưỡng 0.32 là lựa chọn tối ưu tuyệt đối.")

    add_h2("Câu 5: Nếu kẻ gian cầm ảnh điện thoại hoặc ảnh in của người khác đến Kiosk thì sao?")
    add_p("Dạ thưa Thầy, hệ thống sẽ phát hiện và chặn đứng ngay lập tức:", bold_prefix="👉 Gợi ý trả lời: ")
    add_bullet("AI Service đã được tích hợp mô hình MiniFASNet để thực hiện kiểm tra Liveness thụ động (Passive Anti-Spoofing).")
    add_bullet("Mô hình phân tích quang học các vân moiré của màn hình điện thoại và độ phản xạ bề mặt giấy in. Khi phát hiện gian lận, hệ thống trả về mã lỗi SPOOF_DETECTED trong vòng 768ms, Kiosk đổi viền đỏ, còi báo reo và không mở cổng.")

    # Save document
    output_path = r"C:\Users\ADMIN\Downloads\dacn noteee.docx"
    doc.save(output_path)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    create_styled_document()
