import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSafeRedirectUrl } from '@/config/rbac'

interface LoginPageProps {
  searchParams?: Promise<{ redirect?: string }>
}

function LoginFormSkeleton() {
  return (
    <div className="h-screen flex w-full font-sans overflow-hidden relative bg-[#050505] items-center justify-center">
      <div className="w-full max-w-[400px] xl:max-w-[460px] p-8 rounded-3xl border border-white/10 bg-[#0F0F10]/60 animate-pulse">
        <div className="h-16 w-16 mx-auto bg-white/10 rounded-2xl mb-6" />
        <div className="h-8 w-48 mx-auto bg-white/10 rounded-lg mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-12 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-12 bg-white/20 rounded-xl mt-6" />
        </div>
      </div>
    </div>
  )
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const safeRedirect = getSafeRedirectUrl(resolvedSearchParams?.redirect)

  // If already authenticated with a valid profile, redirect to requested destination or dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect(safeRedirect)
  }

  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm initialRedirect={safeRedirect} />
    </Suspense>
  )
}
