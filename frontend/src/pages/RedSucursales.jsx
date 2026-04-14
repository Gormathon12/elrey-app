import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Badge from '../components/ui/Badge'
import LineaSemanal from '../components/charts/LineaSemanal'
import BarComparativa from '../components/charts/BarComparativa'
import { DIAS_SEMANA_ES } from '../data/mockData'
import api from '../services/api'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function RedSucursales() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/arqueos/red/semana')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Armar datos para charts
  const chartData = (() => {
    if (!data.length) return []
    const dias = data[0]?.semanal || []
    return dias.map((dia) => {
      const row = { dia: DIAS_SEMANA_ES[dia.dia] || dia.dia }
      data.forEach((suc) => {
        const d = suc.semanal.find((s) => s.fecha === dia.fecha)
        row[suc.nombre] = d?.total_ventas || 0
      })
      return row
    })
  })()

  const totalVentasRed = data.reduce((s, d) => s + d.ventas_hoy, 0)
  const totalArqueos   = data.reduce((s, d) => s + d.arqueos_hoy, 0)
  const sucursalTop    = data.reduce((best, d) => d.ventas_hoy > (best?.ventas_hoy ?? 0) ? d : best, null)
  const hayAlertas     = data.some((d) => d.estado_hoy !== 'ok')

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <div className="w-10 h-10 border-4 border-red-deep/20 border-t-red-deep rounded-full animate-spin" />
    </div>
  )

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Alerta crítica */}
      {hayAlertas && (
        <motion.div
          variants={item}
          className="bg-red-50 border border-red-200 rounded-card px-5 py-3
                     flex items-center gap-3 text-red-700 text-sm font-medium"
        >
          <span className="text-xl">🔴</span>
          <span>Hay sucursales con diferencias de caja que requieren atención.</span>
        </motion.div>
      )}

      {/* KPIs red */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Red Hoy',      value: ARS(totalVentasRed), icon: '💵' },
          { label: 'Arqueos Cargados',    value: totalArqueos,         icon: '📋' },
          { label: 'Sucursales Activas',  value: data.length,          icon: '🏬' },
          { label: 'Sucursal Top',        value: sucursalTop?.nombre || '—', icon: '🏆' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -3 }}
            className="glass-card p-5"
          >
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="font-display text-xl font-bold text-red-deep">{kpi.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Cards por sucursal */}
      <div className="grid md:grid-cols-3 gap-4">
        {data.map((suc) => (
          <motion.div
            key={suc.sucursal_id}
            variants={item}
            whileHover={{ scale: 1.02, y: -3 }}
            className="glass-card p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display font-bold text-red-deep text-lg">{suc.nombre}</p>
                <p className="text-xs text-gray-400">
                  {suc.arqueos_hoy} {suc.arqueos_hoy === 1 ? 'arqueo' : 'arqueos'} hoy
                </p>
              </div>
              <Badge estado={suc.estado_hoy} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ventas hoy</span>
                <span className="font-bold text-gray-800 text-sm">{ARS(suc.ventas_hoy)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Diferencia</span>
                <span className={`font-bold text-sm ${suc.diferencia_hoy >= 0 ? 'text-emerald-600' : 'text-red-mid'}`}>
                  {ARS(suc.diferencia_hoy)}
                </span>
              </div>
            </div>

            {/* Mini sparkline con datos semanales */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Últimos 7 días</p>
              <div className="flex items-end gap-1 h-8">
                {suc.semanal.map((d, i) => {
                  const max = Math.max(...suc.semanal.map((x) => x.total_ventas), 1)
                  const pct = (d.total_ventas / max) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{ height: `${Math.max(pct, 8)}%`, background: i === 6 ? '#8B1A1A' : 'rgba(139,26,26,0.2)' }}
                      title={`${d.dia}: ${ARS(d.total_ventas)}`}
                    />
                  )
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gráficos */}
      {chartData.length > 0 && (
        <>
          <motion.div variants={item} className="glass-card p-5">
            <h3 className="font-display font-bold text-red-deep mb-4">Ventas Semanales — Red</h3>
            <LineaSemanal data={chartData} sucursales={data} />
          </motion.div>

          <motion.div variants={item} className="glass-card p-5">
            <h3 className="font-display font-bold text-red-deep mb-4">Comparativa por Día</h3>
            <BarComparativa data={chartData} sucursales={data} />
          </motion.div>
        </>
      )}

      {data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏬</p>
          <p>No hay sucursales activas registradas</p>
        </div>
      )}
    </motion.div>
  )
}
