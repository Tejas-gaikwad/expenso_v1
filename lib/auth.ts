import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
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
            const allowedEmails = [
                'tejasgaikwad0504@gmail.com', // replace with your actual Gmail
            ]
            return allowedEmails.includes(user.email)
        },
        async jwt({ token, account }: any) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token as any
        },
    }
}