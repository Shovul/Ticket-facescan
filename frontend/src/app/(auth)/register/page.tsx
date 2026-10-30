'use client';

import React from 'react';
import Link from 'next/link';
import '../../../styles/auth.css';
import { RegisterForm } from '../../../components/auth/RegisterForm';
import { GoogleAuthProviderWrapper } from '../../../components/auth/GoogleAuthProviderWrapper';

export default function RegisterPage() {
  return (
    <GoogleAuthProviderWrapper>
      <RegisterForm />
    </GoogleAuthProviderWrapper>
  );
}
