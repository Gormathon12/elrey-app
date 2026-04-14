import { motion } from 'framer-motion'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

export default function StatCard({ title, value, icon, type = 'currency', trend, colorOverride, index = 0 }) {
  const animated = useAnimatedNumber(value ?? 0)

  const isNegative = type === 'currency' && value < 0
  const valueColor = colorOverride || (isNegative ? 'text-red-mid' : 'text-emerald-600')

  const display =
    type === 'currency'
      ? ARS(animated)
      : type === 'integer'
      ? Math.round(animated).toLocaleString('es-AR')
      : animated.toFixed(0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -3 }}
      className="glass-card p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-xl font-bold font-display ${valueColor} leading-tight`}>
        {display}
      </p>
    </motion.div>
  )
}
