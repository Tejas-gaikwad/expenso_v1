import { getServerSession } from 'next-auth'
import SessionWrapper from './SessionWrapper'
import './globals.css'
import { authOptions } from '@/lib/auth'


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  console.log('Session on server:', session?.user?.email)
  return (
    <html lang="en">
      <body>
        <SessionWrapper session={session}>
          {children}
        </SessionWrapper>
      </body>
    </html>
  )
}