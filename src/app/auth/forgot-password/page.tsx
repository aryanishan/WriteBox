import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/frontend/components/auth/ForgotPasswordPage';

export const metadata: Metadata = {
  title: 'Reset Password — WriteBox',
  description: 'Reset your WriteBox account password.',
};

export default function ForgotPassword() {
  return <ForgotPasswordPage />;
}
