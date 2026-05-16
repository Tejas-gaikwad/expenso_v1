'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'

const CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Transfer', 'Other']
const CATEGORY_COLORS: any = {
    Food: '#f97316',
    Transport: '#3b82f6',
    Shopping: '#a855f7',
    Bills: '#ef4444',
    Entertainment: '#ec4899',
    Health: '#22c55e',
    Transfer: '#facc15',
    Other: '#6b7280',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [transactions, setTransactions] = useState<any[]>([])
    const [syncing, setSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [selectedType, setSelectedType] = useState('All')
    const [searchMerchant, setSearchMerchant] = useState('')
    const [dateRange, setDateRange] = useState('all')

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/')
    }, [status])

    useEffect(() => {
        if (session) fetchTransactions()
    }, [session])

    async function fetchTransactions() {
        setLoading(true)
        const res = await fetch('/api/transactions')
        const data = await res.json()
        setTransactions(data.transactions || [])
        setLoading(false)
    }

    async function handleSync() {
        setSyncing(true)
        setSyncStatus(null)
        const res = await fetch('/api/sync', { method: 'POST' })
        const data = await res.json()
        setSyncStatus(data)
        setSyncing(false)
        fetchTransactions()
    }

    // Filter transactions
    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedCategory !== 'All' && t.category !== selectedCategory) return false
            if (selectedType !== 'All' && t.type !== selectedType) return false
            if (searchMerchant && !t.merchant?.toLowerCase().includes(searchMerchant.toLowerCase())) return false
            if (dateRange === 'thisMonth') {
                const month = new Date(t.date).getMonth()
                if (month !== new Date().getMonth()) return false
            }
            if (dateRange === 'lastMonth') {
                const month = new Date(t.date).getMonth()
                if (month !== new Date().getMonth() - 1) return false
            }
            if (dateRange === 'thisWeek') {
                const txDate = new Date(t.date)
                const now = new Date()
                const weekAgo = new Date(now.setDate(now.getDate() - 7))
                if (txDate < weekAgo) return false
            }
            return true
        })
    }, [transactions, selectedCategory, selectedType, searchMerchant, dateRange])

    // Summary
    const totalSpent = filtered.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
    const totalReceived = filtered.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
    const biggestExpense = filtered.filter(t => t.type === 'debit').reduce((max, t) => Number(t.amount) > max ? Number(t.amount) : max, 0)

    // Monthly bar chart data
    const monthlyData = useMemo(() => {
        const data: any = {}
        transactions.filter(t => t.type === 'debit').forEach(t => {
            const month = MONTHS[new Date(t.date).getMonth()]
            data[month] = (data[month] || 0) + Number(t.amount)
        })
        return MONTHS.filter(m => data[m]).map(m => ({ month: m, amount: Math.round(data[m]) }))
    }, [transactions])

    // Category pie chart data
    const categoryData = useMemo(() => {
        const data: any = {}
        filtered.filter(t => t.type === 'debit').forEach(t => {
            data[t.category] = (data[t.category] || 0) + Number(t.amount)
        })
        return Object.entries(data).map(([name, value]) => ({ name, value: Math.round(value as number) }))
    }, [filtered])

    // Top merchants
    const topMerchants = useMemo(() => {
        const data: any = {}
        filtered.filter(t => t.type === 'debit').forEach(t => {
            data[t.merchant] = (data[t.merchant] || 0) + Number(t.amount)
        })
        return Object.entries(data)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 5)
    }, [filtered])

    // Day of week insights
    const dayOfWeekData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const data: any = {}
        filtered.filter(t => t.type === 'debit').forEach(t => {
            const day = days[new Date(t.date).getDay()]
            data[day] = (data[day] || 0) + Number(t.amount)
        })
        return days.filter(d => data[d]).map(d => ({ day: d, amount: Math.round(data[d]) }))
    }, [filtered])

    if (status === 'loading') return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <p className="text-white">Loading...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">💰 Expenso</h1>
                    <p className="text-gray-400 text-sm">Jan 1 – May 16, 2026</p>
                </div>
                <div className="flex gap-3 items-center">
                    <span className="text-gray-400 text-sm">{session?.user?.email}</span>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                    >
                        {syncing ? 'Syncing...' : '🔄 Sync Gmail'}
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Sync Status */}
            {syncStatus && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 text-sm">
                    ✅ {syncStatus.message} {syncStatus.emailsFetched ? `— ${syncStatus.emailsFetched} emails fetched, ${syncStatus.transactionsSaved} new transactions saved` : ''}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-900 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-red-400">₹{totalSpent.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Total Received</p>
                    <p className="text-2xl font-bold text-green-400">₹{totalReceived.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-blue-400">{filtered.length}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Biggest Expense</p>
                    <p className="text-2xl font-bold text-orange-400">₹{biggestExpense.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                {/* Monthly Bar Chart */}
                <div className="bg-gray-900 rounded-xl p-5">
                    <h2 className="font-semibold mb-4">Monthly Spending</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData}>
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Spent']}
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Pie Chart */}
                <div className="bg-gray-900 rounded-xl p-5">
                    <h2 className="font-semibold mb-4">Spending by Category</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                dataKey="value"
                                paddingAngle={3}
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                {/* Top Merchants */}
                <div className="bg-gray-900 rounded-xl p-5">
                    <h2 className="font-semibold mb-4">🏆 Top 5 Merchants</h2>
                    <div className="space-y-3">
                        {topMerchants.map(([merchant, amount]: any, i) => (
                            <div key={merchant} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                                    <span className="text-gray-300 text-sm">{merchant}</span>
                                </div>
                                <span className="font-medium text-sm">₹{Number(amount).toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day of Week */}
                <div className="bg-gray-900 rounded-xl p-5">
                    <h2 className="font-semibold mb-4">📅 Spending by Day</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={dayOfWeekData}>
                            <XAxis dataKey="day" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Spent']}
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                            />
                            <Bar dataKey="amount" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-900 rounded-xl p-5 mb-6">
                <h2 className="font-semibold mb-4">🔍 Filters</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search merchant..."
                        value={searchMerchant}
                        onChange={e => setSearchMerchant(e.target.value)}
                        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Date Range */}
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none"
                    >
                        <option value="all">All Time</option>
                        <option value="thisWeek">This Week</option>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                    </select>

                    {/* Category */}
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none"
                    >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>

                    {/* Type */}
                    <select
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none"
                    >
                        <option value="All">All Types</option>
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                    </select>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-gray-900 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold">Transactions</h2>
                    <span className="text-gray-400 text-sm">{filtered.length} results</span>
                </div>
                {loading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-gray-500 text-sm">No transactions found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-800">
                                    <th className="text-left py-3 pr-4">Date</th>
                                    <th className="text-left py-3 pr-4">Merchant</th>
                                    <th className="text-left py-3 pr-4">Category</th>
                                    <th className="text-left py-3 pr-4">Bank</th>
                                    <th className="text-right py-3">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(tx => (
                                    <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                                        <td className="py-3 pr-4 text-gray-400">{tx.date}</td>
                                        <td className="py-3 pr-4 font-medium">{tx.merchant || 'Unknown'}</td>
                                        <td className="py-3 pr-4">
                                            <span
                                                className="px-2 py-1 rounded-full text-xs"
                                                style={{ backgroundColor: `${CATEGORY_COLORS[tx.category]}22`, color: CATEGORY_COLORS[tx.category] }}
                                            >
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-400">{tx.bank}</td>
                                        <td className={`py-3 text-right font-semibold ${tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
                                            {tx.type === 'debit' ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}