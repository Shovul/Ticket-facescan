import { redirect } from 'next/navigation';

export default function RootPage() {
  // Tự động chuyển hướng về trang danh sách sự kiện công khai (UC06)
  redirect('/events');
}
