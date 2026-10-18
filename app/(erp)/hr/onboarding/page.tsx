import { redirect } from 'next/navigation'

export default async function LegacyOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const query = resolved ? new URLSearchParams(resolved as any).toString() : ''
  const destination = query ? `/employees?${query}` : '/employees'
  redirect(destination)
}
