export type UserRole = 'customer' | 'organizer' | 'admin' | 'user';

export interface RegisterRequest {
  fullName: string;
  username: string;
  phoneNumber?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  hasPassword: boolean;
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface RegisterFormErrors {
  fullName?: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginFormErrors {
  identifier?: string;
  password?: string;
}
