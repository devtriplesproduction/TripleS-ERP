'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAction } from '@/actions/auth.actions'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import Image from 'next/image'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginAction(email.trim(), password)
      if (result.success) {
        router.push(redirectTo)
        router.refresh()
      } else {
        setError(result.error || 'Invalid credentials')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full font-sans overflow-hidden relative bg-[#050505]">
      {/* Full-screen Background Visuals */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Base overlay gradient to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/95 via-[#050505]/60 to-[#050505]/80 z-10"></div>
        {/* Radial soft lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent z-10 opacity-60"></div>
        
        <Image 
          src="/building.jpg" 
          alt="Corporate Office" 
          fill 
          className="object-cover object-center opacity-70 grayscale" 
          priority
        />
        {/* Abstract Circular Lines (CSS based) */}
        <div className="absolute -top-[30%] -right-[20%] w-[120%] h-[120%] rounded-full border border-white/[0.04] z-0" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[100%] h-[100%] rounded-full border border-white/[0.03] z-0" />
        <div className="absolute top-[20%] -left-[30%] w-[140%] h-[140%] rounded-full border border-white/[0.02] z-0" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full h-full min-h-screen">
        {/* Left Branding Section (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-24 text-white">
          
          {/* Top Brand Identity */}
          <div className="z-20 relative pt-4">
            <div className="flex items-center gap-5 mb-6">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white/10 p-2.5 border border-white/20 shadow-lg backdrop-blur-sm">
                <Image src="/logo.png" alt="TripleS ERP Logo" fill sizes="56px" className="object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">TripleS ERP</h1>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 mt-1.5 font-medium">People · Process · Progress</p>
              </div>
            </div>
            
            <div className="w-14 h-[2px] bg-white/20 mt-12 mb-10"></div>
            
            <h2 className="text-[40px] xl:text-[56px] font-bold leading-[1.1] mb-6 text-white tracking-tight">
              One Platform<br />for a Stronger<br />Tomorrow
            </h2>
            <p className="text-lg xl:text-xl text-gray-400 max-w-md font-light leading-relaxed">
              Manage your people, projects, operations and growth — all in one place.
            </p>
          </div>

          {/* Footer */}
          <div className="z-20 relative pb-4 text-sm text-gray-400 font-medium">
            © {new Date().getFullYear()} TripleS ERP. All rights reserved.
          </div>
        </div>

        {/* Right Login Section */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 xl:p-20 relative">
          
          {/* Small Screen Logo (Visible only on mobile/tablet) */}
          <div className="lg:hidden flex flex-col items-center mb-10 w-full max-w-[480px] text-white">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white/10 p-3 mb-5 border border-white/20 shadow-sm backdrop-blur-sm">
              <Image src="/logo.png" alt="TripleS ERP" fill sizes="64px" className="object-contain" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">TripleS ERP</h2>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-[400px] xl:max-w-[460px] bg-[#0F0F10]/60 p-8 sm:p-10 rounded-3xl border border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[18px] relative z-10">
            
            <div className="flex flex-col items-center mb-8">
              <div className="hidden lg:block relative h-16 w-16 overflow-hidden rounded-2xl bg-[#050505] p-3 mb-6 border border-white/10 shadow-md">
                 <Image src="/logo.png" alt="TripleS ERP" fill sizes="64px" className="object-contain dark:invert-0 invert" />
              </div>
              <h2 className="hidden lg:block text-3xl font-bold text-white tracking-tight mb-2.5">TripleS ERP</h2>
              <p className="text-[15px] text-gray-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3.5 rounded-xl text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                <label htmlFor="email" className="text-sm font-semibold text-white">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@triplesproduction.com"
                    required
                    autoComplete="email"
                    className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="password" className="text-sm font-semibold text-white">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-6 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <span className="ml-1 text-lg leading-none">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 flex items-center">
               <div className="flex-1 border-t border-white/10"></div>
               <div className="px-4 text-[11px] text-gray-500 uppercase tracking-widest font-semibold">OR</div>
               <div className="flex-1 border-t border-white/10"></div>
            </div>

            <p className="text-[13px] text-gray-400 text-center mt-8 font-medium">
              Contact HR or Admin if you need account access.
            </p>
          </div>
          
          {/* Footer for Mobile/Tablet */}
          <div className="lg:hidden mt-8 text-xs text-gray-500 font-medium text-center">
            © {new Date().getFullYear()} TripleS ERP. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
