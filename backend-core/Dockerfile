FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app

# Copy toàn bộ mã nguồn backend-core vào container
COPY . .

# Chỉ định rõ file .csproj của API để restore thư viện
RUN dotnet restore src/EventPass.API/EventPass.API.csproj

EXPOSE 5000

# Di chuyển vào thư mục API và chạy
WORKDIR /app/src/EventPass.API
CMD ["dotnet", "run", "--urls", "http://0.0.0.0:5000"]