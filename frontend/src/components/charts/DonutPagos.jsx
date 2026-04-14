import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { METODOS_PAGO_LABELS, METODOS_COLORES } from '../../data/mockData'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-gray-700">{d.name}</p>
      <p className="text-red-deep font-bold">{ARS(d.value)}</p>
      <p className="text-gray-400">{d.payload.porcentaje.toFixed(1)}%</p>
    </div>
  )
}

const CustomLegend = ({ payload }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
    {payload?.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
        <span className="text-xs text-gray-600 truncate">{entry.value}</span>
      </div>
    ))}
  </div>
)

export default function DonutPagos({ pagos = [] }) {
  const total = pagos.reduce((s, p) => s + p.monto, 0)

  const data = pagos
    .filter((p) => p.monto > 0)
    .map((p) => ({
      name:       METODOS_PAGO_LABELS[p.metodo] || p.metodo,
      value:      p.monto,
      color:      METODOS_COLORES[p.metodo] || '#9CA3AF',
      porcentaje: total > 0 ? (p.monto / total) * 100 : 0,
    }))

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin datos de pagos
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend payload={data.map((d) => ({ value: d.name, color: d.color }))} />
    </div>
  )
}
