@echo off
echo ==============================================
echo KHOI DONG TOAN BO HE THONG EVENTPASS (LOCAL)
echo ==============================================
start "EventPass - AI Service (Port 8000)" cmd /k "C:\Users\ADMIN\Ticket-facescan\start_ai.bat"
start "EventPass - Backend API (Port 5000)" cmd /k "C:\Users\ADMIN\Ticket-facescan\start_backend.bat"
start "EventPass - Frontend (Port 3000)" cmd /k "C:\Users\ADMIN\Ticket-facescan\start_frontend.bat"
echo Da khoi dong ca 3 dich vu tren cac cua so rieng biet!
