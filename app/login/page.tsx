import { LoginForm } from './login-form'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  // If already authenticated with a valid profile, redirect to dashboard
  const user = await getCurrentUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
