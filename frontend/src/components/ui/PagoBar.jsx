import { motion } from 'framer-motion'
import { METODOS_PAGO_LABELS, METODOS_COLORES } from '../../data/mockData'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

export default function PagoBar({ metodo, monto, total, transacciones }) {
  const porcentaje = total > 0 ? Math.min((monto / total) * 100, 100) : 0
  const color = METODOS_COLORES[metodo] || '#9CA3AF'
  const label = METODOS_PAGO_LABELS[metodo] || metodo

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-400">({transacciones} tx)</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-gray-800">{ARS(monto)}</span>
          <span className="text-xs text-gray-400 ml-2">{porcentaje.toFixed(1)}%</span>
        </div>
      </div>

      {/* Barra animada */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${porcentaje}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}
