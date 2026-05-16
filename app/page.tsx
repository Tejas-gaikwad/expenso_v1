'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">💰 Expenso</h1>
        <p className="text-gray-400 mb-8">Auto track your expenses from Gmail</p>
        <button
          onClick={() => signIn('google')}
          className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}