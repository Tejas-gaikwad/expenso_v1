import { supabase } from '@/lib/supabase'

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', '2026-01-01')
            .lte('date', '2026-05-13')
            .order('date', { ascending: false })

        if (error) throw error

        return Response.json({ transactions: data })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong'
        console.error('Sync error:', error)
        return Response.json({ error: message }, { status: 500 })
    }
}