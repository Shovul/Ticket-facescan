import { Metadata } from 'next';
import { RegisterForm } from '../../../components/auth/RegisterForm';
import '../../../styles/auth.css';

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản — EventPass Ticket',
  description: 'Đăng ký tài khoản EventPass để giữ chỗ vé điện tử và kích hoạt điểm danh khuôn mặt Face ID siêu tốc.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
