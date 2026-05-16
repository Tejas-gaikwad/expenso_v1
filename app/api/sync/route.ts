import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchTransactionEmails } from '@/lib/gmail'
import { parseEmailBatch } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

export async function POST() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.accessToken) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Step 1: Fetch emails from Gmail
        const emails = await fetchTransactionEmails(session.accessToken)
        console.log(`Fetched ${emails.length} emails`)

        // Filter out emails already in Supabase
        const { data: existingTxns } = await supabase
            .from('transactions')
            .select('email_id')

        const existingIds = new Set(existingTxns?.map((t: any) => t.email_id) || [])
        const newEmails = emails.filter(e => !existingIds.has(e.id))
        console.log(`New emails to process: ${newEmails.length} (skipped ${emails.length - newEmails.length} already saved)`)

        if (newEmails.length === 0) {
            await supabase
                .from('sync_meta')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('id', 1)
            return Response.json({ message: 'No new transactions to process', count: 0 })
        }

        // Replace emails with only new ones
        const emailsToProcess = newEmails

        if (emails.length === 0) {
            return Response.json({ message: 'No transaction emails found', count: 0 })
        }

        // Step 2: Batch emails in groups of 25
        const batchSize = 25
        const batches: any[] = []
        for (let i = 0; i < emailsToProcess.length; i += batchSize) {
            batches.push(emailsToProcess.slice(i, i + batchSize))
        }

        // Step 3: Parse each batch with OpenAI
        let allTransactions: any[] = []
        for (const batch of batches) {
            const parsed = await parseEmailBatch(batch)
            allTransactions = [...allTransactions, ...parsed]
        }

        console.log(`Parsed ${allTransactions.length} transactions`)

        // Step 4: Save to Supabase (skip duplicates using email_id)
        let saved = 0
        for (const tx of allTransactions) {
            console.log('Saving tx:', JSON.stringify(tx))
            const { data, error } = await supabase
                .from('transactions')
                .upsert(tx, { onConflict: 'email_id' })

            console.log('Supabase result:', data, error)
            if (error) console.error('Supabase error:', error)
            else saved++
        }

        return Response.json({
            message: 'Sync complete',
            emailsFetched: emails.length,
            transactionsParsed: allTransactions.length,
            transactionsSaved: saved,
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong'
        console.error('Sync error:', error)
        return Response.json({ error: message }, { status: 500 })
    }
}