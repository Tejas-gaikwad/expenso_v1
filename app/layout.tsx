import { getServerSession } from 'next-auth'
import SessionWrapper from './SessionWrapper'
import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
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