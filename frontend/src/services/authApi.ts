import axios from 'axios';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthApiResponse,
  GoogleLoginRequest
} from '../types/auth';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthApiResponse<RegisterResponse>> {
    try {
      const response = await axios.post<AuthApiResponse<RegisterResponse>>(
        `${BASE_URL}/auth/register`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
        data: null,
      };
    }
  },

  async login(data: LoginRequest): Promise<AuthApiResponse<LoginResponse>> {
    try {
      const response = await axios.post<AuthApiResponse<LoginResponse>>(
        `${BASE_URL}/auth/login`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
        data: null,
      };
    }
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthApiResponse<string>> {
    try {
      const response = await axios.post<AuthApiResponse<string>>(
        `${BASE_URL}/auth/forgot-password`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
        data: null,
      };
    }
  },

  async resetPassword(data: ResetPasswordRequest): Promise<AuthApiResponse<string>> {
    try {
      const response = await axios.post<AuthApiResponse<string>>(
        `${BASE_URL}/auth/reset-password`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Không thể đặt lại mật khẩu. Mã token không hợp lệ hoặc đã hết hạn.',
        data: null,
      };
    }
  },

  async googleLogin(data: GoogleLoginRequest): Promise<AuthApiResponse<LoginResponse>> {
    try {
      const response = await axios.post<AuthApiResponse<LoginResponse>>(
        `${BASE_URL}/auth/google-login`,
        data,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Lỗi xác thực với Google. Vui lòng thử lại sau.',
        data: null,
      };
    }
  },

  async logout(): Promise<void> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        await axios.post(`${BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {
      // Bỏ qua lỗi logout phía server nếu token hết hạn
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  }
};
