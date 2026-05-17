import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    session: {
        strategy: 'jwt' as const,
        maxAge: 30 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async signIn({ user }: any) {
            const allowedEmails = ['tejasgaikwad0504@gmail.com']
            return allowedEmails.includes(user.email)
        },
        async jwt({ token, account }: any) {
            if (account?.access_token) {
                token.accessToken = account.access_token
            }
            return token as any
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken
            return session
        },
    },
}