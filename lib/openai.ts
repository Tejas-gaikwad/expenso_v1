import OpenAI from 'openai'

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function parseEmailBatch(emails: { id: string; subject: string; date: string; body: string }[]) {
    console.log('Batch size:', emails.length, 'First email subject:', emails[0]?.subject)
    console.log('First email body preview:', emails[0]?.body?.slice(0, 200))
    const emailText = emails.map((e, i) =>
        `--- EMAIL ${i + 1} (ID: ${e.id}) ---
        Subject: ${e.subject}
        Date: ${e.date}
        Body: ${e.body.slice(0, 1500)}
        `
    ).join('\n')

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: `You are a financial data extractor. Extract transaction details from these bank/payment emails.

For each email that contains a transaction, return a JSON array with objects like:
{
  "email_id": "the email ID provided",
  "date": "YYYY-MM-DD",
  "amount": 450.00,
  "type": "debit" or "credit",
  "merchant": "merchant or recipient name",
  "category": one of ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Transfer", "Other"],
  "bank": "HDFC" or "SBI" or "PhonePe" or "GPay" or "Paytm"
}

Skip any email that is NOT a transaction (promotions, OTPs, etc).
Return ONLY a valid JSON array, no explanation, no markdown.

Emails:
${emailText}`,
            },
        ],
    })

    try {
        const text = response.choices[0].message.content!.trim()
        console.log('OpenAI raw response:', text)
        return JSON.parse(text)
    } catch (e) {
        console.error('OpenAI parse error:', e)
        return []
    }


}