import type { Metadata } from 'next';
import { LoginPage } from '@/frontend/components/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Sign In — WriteBox',
  description: 'Sign in to your WriteBox account to sync your notes across devices.',
};

export default function Login() {
  return <LoginPage />;
}
