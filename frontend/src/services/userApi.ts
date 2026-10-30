import axios from 'axios';
import { AuthApiResponse } from '../types/auth';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface UserProfileData {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  hasFaceRegistered: boolean;
  role: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export const userApi = {
  async getProfile(): Promise<AuthApiResponse<UserProfileData>> {
    try {
      const response = await axios.get<AuthApiResponse<UserProfileData>>(`${BASE_URL}/user/profile`, {
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      return { success: false, message: 'Lỗi tải thông tin tài khoản.', data: null };
    }
  },

  async updateProfile(data: UpdateProfileRequest): Promise<AuthApiResponse<UserProfileData>> {
    try {
      const response = await axios.put<AuthApiResponse<UserProfileData>>(`${BASE_URL}/user/profile`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      return { success: false, message: 'Lỗi cập nhật thông tin cá nhân.', data: null };
    }
  },

  async changePassword(data: ChangePasswordRequest): Promise<AuthApiResponse<boolean>> {
    try {
      const response = await axios.post<AuthApiResponse<boolean>>(`${BASE_URL}/user/change-password`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      return { success: false, message: 'Lỗi đổi mật khẩu.', data: null };
    }
  },

  async uploadFaceProfile(file: File): Promise<AuthApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<AuthApiResponse<any>>(`${BASE_URL}/user/face-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeader(),
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) return error.response.data;
      return { success: false, message: 'Không thể xử lý khuôn mặt. Vui lòng thử lại với ảnh rõ nét hơn.', data: null };
    }
  },
};
