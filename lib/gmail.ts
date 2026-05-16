import { google } from 'googleapis'

export function getGmailClient(accessToken: string) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    return google.gmail({ version: 'v1', auth })
}

export async function fetchTransactionEmails(accessToken: string, lastSyncedAt?: string) {
    const gmail = getGmailClient(accessToken)

    const senders = [
        'alerts@hdfcbank.bank.in',
        'alerts@hdfcbank.com',
        'alerts@sbi.co.in',
        'sbiatm@alerts.sbi.co.in',
        'noreply@phonepe.com',
        'noreply@gpay.com',
        'alerts@paytm.com',
    ]

    const fromQuery = senders.map(s => `from:${s}`).join(' OR ')
    const afterDate = lastSyncedAt
        ? new Date(lastSyncedAt).toISOString().split('T')[0].replace(/-/g, '/')
        : '2026/01/01'

    const query = `(${fromQuery}) after:${afterDate}`

    const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500,
    })

    const messages = response.data.messages || []

    const emails = await Promise.all(
        messages.map(async (msg) => {
            const full = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'full',
            })

            const headers = full.data.payload?.headers || []
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
            const date = headers.find((h: any) => h.name === 'Date')?.value || ''

            let body = ''
            const parts = full.data.payload?.parts || []
            if (parts.length > 0) {
                // Try plain text first
                const textPart = parts.find((p: any) => p.mimeType === 'text/plain')
                if (textPart?.body?.data) {
                    body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
                } else {
                    // Fall back to HTML and strip tags
                    const htmlPart = parts.find((p: any) => p.mimeType === 'text/html')
                    if (htmlPart?.body?.data) {
                        const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8')
                        body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    } else {
                        // Try nested parts (some emails have parts within parts)
                        for (const part of parts) {
                            const nestedParts = part.parts || []
                            const nestedText = nestedParts.find((p: any) => p.mimeType === 'text/plain')
                            const nestedHtml = nestedParts.find((p: any) => p.mimeType === 'text/html')
                            if (nestedText?.body?.data) {
                                body = Buffer.from(nestedText.body.data, 'base64').toString('utf-8')
                                break
                            } else if (nestedHtml?.body?.data) {
                                const html = Buffer.from(nestedHtml.body.data, 'base64').toString('utf-8')
                                body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                                break
                            }
                        }
                    }
                }
            } else if (full.data.payload?.body?.data) {
                body = Buffer.from(full.data.payload.body.data, 'base64').toString('utf-8')
            }

            return {
                id: msg.id!,
                subject,
                date,
                body,
            }
        })
    )

    return emails
}