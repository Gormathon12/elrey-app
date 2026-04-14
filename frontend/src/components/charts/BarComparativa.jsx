import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

const COLORS = ['#8B1A1A', '#C0392B', '#E8A87C']

const ARS_K = (n) => {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-card">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.dataKey}</span>
          </span>
          <span className="font-semibold text-red-deep">{ARS_K(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BarComparativa({ data = [], sucursales = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin datos para comparar
      </div>
    )
  }

  const keys = sucursales.length
    ? sucursales.map((s) => s.nombre)
    : Object.keys(data[0] || {}).filter((k) => k !== 'dia' && k !== 'fecha')

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,26,26,0.06)" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={ARS_K} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={45} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,26,26,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            animationDuration={700}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
