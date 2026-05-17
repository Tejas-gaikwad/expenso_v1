import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchTransactionEmails } from '@/lib/gmail'
import { parseEmailBatch } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        // console.log('Session user:', session?.user?.email)
        // console.log('Access token exists:', !!session?.accessToken)
        // console.log('Full session:', JSON.stringify(session))

        if (!session?.accessToken) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Step 1: Get last synced timestamp
        const { data: syncMeta } = await supabase
            .from('sync_meta')
            .select('last_synced_at')
            .eq('id', 1)
            .single()

        const lastSyncedAt = syncMeta?.last_synced_at
        // console.log('Last synced at:', lastSyncedAt ?? 'Never — fetching from Jan 1')

        // Step 2: Fetch emails from Gmail
        const emails = await fetchTransactionEmails(session.accessToken, lastSyncedAt)
        // console.log(`Fetched ${emails.length} emails`)

        // Step 3: Filter out emails already in Supabase
        const { data: existingTxns } = await supabase
            .from('transactions')
            .select('email_id')

        const existingIds = new Set(existingTxns?.map((t: any) => t.email_id) || [])
        const newEmails = emails.filter(e => !existingIds.has(e.id))
        // console.log(`New emails to process: ${newEmails.length} (skipped ${emails.length - newEmails.length} already saved)`)

        if (newEmails.length === 0) {
            await supabase
                .from('sync_meta')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('id', 1)
            return Response.json({ message: 'No new transactions to process', count: 0 })
        }

        // Step 4: Batch emails in groups of 25
        const batchSize = 25
        const batches: any[] = []
        for (let i = 0; i < newEmails.length; i += batchSize) {
            batches.push(newEmails.slice(i, i + batchSize))
        }

        // Step 5: Parse each batch with OpenAI
        let allTransactions: any[] = []
        for (const batch of batches) {
            const parsed = await parseEmailBatch(batch)
            allTransactions = [...allTransactions, ...parsed]
        }

        // console.log(`Parsed ${allTransactions.length} transactions`)

        // Step 6: Save to Supabase
        let saved = 0
        for (const tx of allTransactions) {
            console.log('Saving tx:', tx.email_id, tx.amount, tx.date)
            const { data, error } = await supabase
                .from('transactions')
                .upsert(tx, { onConflict: 'email_id' })

            if (error) {
                console.error('Supabase save error:', JSON.stringify(error))
            } else {
                console.log('Saved successfully:', tx.email_id)
                saved++
            }
        }
        // console.log(`Total saved: ${saved}/${allTransactions.length}`)

        // Step 7: Update last synced timestamp
        await supabase
            .from('sync_meta')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', 1)

        console.log('Sync complete. Last synced updated to now.')

        return Response.json({
            message: 'Sync complete',
            emailsFetched: emails.length,
            transactionsParsed: allTransactions.length,
            transactionsSaved: saved,
            lastSyncedAt: new Date().toISOString(),
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong'
        console.error('Sync error:', error)
        return Response.json({ error: message }, { status: 500 })
    }
}