# Sử dụng base image Node.js chính thức phiên bản nhẹ
FROM node:20-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép các file định nghĩa dependencies
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm cả devDependencies để phục vụ việc build React)
RUN npm install

# Sao chép toàn bộ mã nguồn của dự án vào container
COPY . .

# Biên dịch frontend React sang thư mục tĩnh dist/
RUN npm run build

# Dọn dẹp, xóa bỏ các devDependencies để giảm tối đa kích thước container
RUN npm prune --production

# Cấu hình biến môi trường production
ENV PORT=5000
ENV NODE_ENV=production

# Mở cổng 5000 của container
EXPOSE 5000

# Lệnh khởi chạy chính: Chạy server Express phục vụ cả API và Frontend tĩnh
CMD ["node", "backend/server.js"]
