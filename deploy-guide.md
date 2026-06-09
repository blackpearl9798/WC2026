# HƯỚNG DẪN TRIỂN KHAI ỨNG DỤNG DỰ ĐOÁN WC 2026

Ứng dụng của bạn được thiết kế theo mô hình **Single Server**, nghĩa là máy chủ Express backend sẽ phục vụ cả API lẫn các file tĩnh của giao diện React (trong thư mục `dist/`). Điều này giúp việc triển khai trở nên cực kỳ đơn giản.

Dưới đây là 3 cách phổ biến để bạn đưa ứng dụng vào hoạt động thực tế trong công ty:

---

## CÁCH 1: Triển khai trực tiếp bằng PM2 (Dành cho máy chủ VPS Ubuntu/Windows nội bộ)

Đây là cách phổ biến nhất nếu công ty bạn có một máy chủ Windows Server hoặc Linux (Ubuntu) trong mạng nội bộ.

### Các bước chuẩn bị trên máy chủ:
1. Cài đặt **Node.js** (Phiên bản khuyến nghị: >= 20.x).
2. Cài đặt trình quản lý tiến trình **PM2** toàn cục:
   ```bash
   npm install -g pm2
   ```

### Các bước triển khai:
1. Sao chép toàn bộ mã nguồn thư mục `WC2026` lên server.
2. Tại thư mục gốc của dự án, cài đặt toàn bộ dependencies:
   ```bash
   npm install
   ```
3. Tiến hành biên dịch frontend React:
   ```bash
   npm run build
   ```
4. Khởi chạy server Express dưới quyền quản lý của PM2 để ứng dụng chạy ngầm liên tục và tự khởi động lại nếu bị crash:
   ```bash
   pm2 start backend/server.js --name "dudoan-wc2026"
   ```
5. Để lưu cấu hình tự khởi động cùng hệ thống:
   ```bash
   pm2 save
   pm2 startup
   ```

*Ứng dụng sẽ hoạt động tại địa chỉ IP của server trên cổng `5000` (Ví dụ: `http://192.168.1.50:5000`).*

---

## CÁCH 2: Triển khai bằng Docker (Khuyên dùng - Đóng gói hoàn chỉnh)

Dockerfile đã được tạo sẵn ở thư mục gốc giúp bạn đóng gói và chạy ứng dụng chỉ với vài lệnh đơn giản.

> [!IMPORTANT]
> **Lưu ý cực kỳ quan trọng về dữ liệu**: Vì database được lưu ở dạng file `backend/db.json`, bạn **phải mount** thư mục `backend/` ra ngoài container (sử dụng Docker Volume) để tránh mất mát dữ liệu tài khoản và điểm số khi container khởi động lại hoặc cập nhật.

### Các bước thực hiện:
1. Biên dịch Docker Image:
   ```bash
   docker build -t wc2026-predictions .
   ```
2. Khởi chạy Docker Container kèm theo mount thư mục database:
   * **Trên Linux / macOS:**
     ```bash
     docker run -d \
       -p 5000:5000 \
       -v $(pwd)/backend:/app/backend \
       --name wc2026-app \
       --restart always \
       wc2026-predictions
     ```
   * **Trên Windows (PowerShell):**
     ```powershell
     docker run -d `
       -p 5000:5000 `
       -v ${PWD}/backend:/app/backend `
       --name wc2026-app `
       --restart always `
       wc2026-predictions
     ```

*Thư mục `backend` bên ngoài máy chủ sẽ đồng bộ trực tiếp với file `db.json` bên trong container. Bạn có thể dễ dàng sao lưu file này.*

---

## CÁCH 3: Triển khai lên dịch vụ Cloud (Render / Railway / Fly.io)

Nếu công ty không có hạ tầng server riêng, bạn có thể đẩy mã nguồn lên GitHub và kết nối với các dịch vụ PaaS như Render hoặc Railway (có các gói miễn phí hoặc giá rất rẻ).

### Các bước thiết lập trên Render.com:
1. Đăng nhập Render, tạo một **Web Service** mới và kết nối với kho chứa GitHub của bạn.
2. Cấu hình các thông số build:
   * **Environment**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `node backend/server.js`
3. Cấu hình biến môi trường (Environment Variables):
   * Thêm biến `PORT` với giá trị `5000` (hoặc để Render tự động cấp phát).
   * Thêm biến `NODE_ENV` với giá trị `production`.
4. **Mount ổ đĩa lưu trữ database (Bắt buộc)**:
   * Do Render tự động xóa sạch dữ liệu đệm mỗi khi deploy hoặc restart, bạn **phải mount ổ đĩa cứng persistent** để không bị mất tài khoản và điểm số của người chơi.
   * Vào mục **Advanced** -> **Disk**.
   * Nhấp chọn tạo mới Disk:
     - **Name**: `db-volume`
     - **Mount Path**:
       * Nếu chọn **Runtime là Docker** (Khuyên dùng): Điền `/app/backend`
       * Nếu chọn **Runtime là Node**: Điền `/opt/render/project/src/backend`
     - **Size**: `1 GiB` (Thoải mái cho hàng chục nghìn lượt dự đoán và tin nhắn).
   * *Ổ đĩa này sẽ được gắn cố định vào thư mục chứa database, bảo vệ file `db.json` an toàn qua các lần cập nhật mã nguồn.*

