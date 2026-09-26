import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '@/lib/format'
import type { Dashboard } from '@/lib/types'

export function ReceiptsTrend({ daily }: { daily: Dashboard['daily'] }) {
  const data = daily.map((d) => ({ ...d, label: formatDate(`${d.day}T00:00`) }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="unitsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="unitsStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--agent)" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--fg-subtle)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)' }}
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--fg-muted)' }}
          itemStyle={{ color: 'var(--fg)' }}
          formatter={(value, name) => [value, name === 'units' ? 'Units' : 'Receipts']}
        />
        <Area
          type="monotone"
          dataKey="units"
          stroke="url(#unitsStroke)"
          strokeWidth={2.5}
          fill="url(#unitsFill)"
          animationDuration={1400}
          animationEasing="ease-out"
          activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
