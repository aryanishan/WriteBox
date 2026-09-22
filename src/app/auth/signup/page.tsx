import type { Metadata } from 'next';
import { SignupPage } from '@/frontend/components/auth/SignupPage';

export const metadata: Metadata = {
  title: 'Sign Up — WriteBox',
  description: 'Create a free WriteBox account to sync your notes across all your devices.',
};

export default function Signup() {
  return <SignupPage />;
}
