FROM node:18-alpine
WORKDIR /app

# Copy file quản lý thư viện và cài đặt
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

EXPOSE 3000
# Chạy Next.js ở chế độ development
CMD ["npm", "run", "dev"]