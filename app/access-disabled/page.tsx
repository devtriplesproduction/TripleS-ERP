import Link from 'next/link'
import { UserX, AlertTriangle, ArrowRight, LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth.actions'

export default function AccessDisabledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 sm:p-6 text-foreground font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#0F0F10] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 text-center">
        {/* Status Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-inner">
          <UserX className="w-8 h-8 text-rose-400" />
        </div>

        {/* Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Access Revoked</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Account Deactivated
        </h1>

        <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">
          Your employee account has been deactivated by an administrator. Active sessions and access to all TripleS ERP resources have been revoked.
        </p>

        {/* Info Box */}
        <div className="bg-[#18181B] border border-[#2A2A2A] rounded-xl p-4 text-xs text-[#A1A1AA] text-left mb-6 space-y-1.5">
          <div className="font-semibold text-white">What does this mean?</div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>You can no longer access ERP modules or server actions.</li>
            <li>All previous sessions are immediately invalidated.</li>
            <li>Your historical records, tasks, and reports remain safely archived.</li>
          </ul>
        </div>

        {/* Action Button */}
        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign In with Another Account</span>
          </button>
        </form>

        <p className="mt-4 text-[11px] text-[#A1A1AA]/80">
          Need access restored? Contact your System Administrator or HR department.
        </p>
      </div>
    </div>
  )
}
