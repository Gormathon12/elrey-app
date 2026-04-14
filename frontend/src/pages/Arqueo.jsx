import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import DonutPagos from '../components/charts/DonutPagos'
import { METODOS_PAGO_LABELS } from '../data/mockData'
import api from '../services/api'
import { exportarExcel } from '../services/excelExport'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n ?? 0)

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Arqueo() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const [arqueo, setArqueo]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.get(`/arqueos/${id}`)
      .then((r) => setArqueo(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'No se pudo cargar el arqueo'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <div className="w-10 h-10 border-4 border-red-deep/20 border-t-red-deep rounded-full animate-spin" />
    </div>
  )

  if (error || !arqueo) return (
    <div className="text-center py-20 text-gray-500">{error || 'Arqueo no encontrado'}</div>
  )

  const pagos   = arqueo.pagos_detalle || []
  const totalPagos = pagos.reduce((s, p) => s + p.monto, 0)

  const handleExport = () => {
    exportarExcel([{
      id: arqueo.id,
      sucursal: arqueo.sucursal?.nombre,
      cajero: arqueo.cajero?.nombre || arqueo.cajero_nombre,
      fecha_apertura: arqueo.fecha_apertura,
      fecha_cierre: arqueo.fecha_cierre,
      monto_inicial: arqueo.monto_inicial,
      ventas_efectivo: arqueo.ventas_efectivo,
      total_esperado: arqueo.total_esperado,
      total_real: arqueo.total_real,
      diferencia: arqueo.diferencia,
      estado: arqueo.estado,
      origen: arqueo.origen,
      pagos: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto, transacciones: p.cantidad_transacciones })),
    }], `ElRey_Arqueo_${arqueo.id}.xlsx`)
  }

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-red-deep/8 text-gray-500 hover:text-red-deep transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-bold text-red-deep text-xl">
              Arqueo #{arqueo.id}
            </h1>
            <p className="text-xs text-gray-400">
              {arqueo.sucursal?.nombre} ·{' '}
              {new Date(arqueo.fecha_cierre).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge estado={arqueo.estado} />
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Excel
          </Button>
        </div>
      </motion.div>

      {/* Resumen financiero */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-red-deep/8 bg-red-deep/3">
          <h2 className="font-display font-bold text-red-deep">Resumen Financiero</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {[
              { label: 'Apertura',       value: formatTime(arqueo.fecha_apertura),  bold: false },
              { label: 'Cierre',         value: formatTime(arqueo.fecha_cierre),    bold: false },
              { label: 'Cajero',         value: arqueo.cajero?.nombre || arqueo.cajero_nombre || '—', bold: false },
              { label: 'Origen',         value: arqueo.origen?.toUpperCase(),       bold: false },
              { label: null },
              { label: 'Monto Inicial',  value: ARS(arqueo.monto_inicial),          bold: false },
              { label: 'Ventas Efectivo',value: ARS(arqueo.ventas_efectivo),        bold: true  },
              { label: 'Total Esperado', value: ARS(arqueo.total_esperado),         bold: true  },
              { label: 'Real en Caja',   value: ARS(arqueo.total_real),             bold: true  },
              { label: 'Diferencia',     value: ARS(arqueo.diferencia),
                valueClass: arqueo.diferencia >= 0 ? 'text-emerald-600' : 'text-red-mid',
                bold: true },
              ...(arqueo.monto_retiro > 0 ? [
                { label: null },
                { label: 'Retiro depositado', value: ARS(arqueo.monto_retiro),
                  valueClass: 'text-amber-600', bold: true },
                { label: 'Queda en caja',     value: ARS(arqueo.total_real - arqueo.monto_retiro),
                  valueClass: 'text-emerald-600', bold: true },
              ] : []),
            ].map((row, i) => {
              if (!row.label) return (
                <tr key={i}><td colSpan={2} className="border-t border-gray-100 py-1" /></tr>
              )
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-cream/40' : ''}>
                  <td className="px-5 py-2.5 text-gray-600">{row.label}</td>
                  <td className={`px-5 py-2.5 text-right ${row.bold ? 'font-bold' : ''} ${row.valueClass || 'text-gray-800'}`}>
                    {row.value}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Desglose pagos + donut */}
      <motion.div variants={item} className="grid md:grid-cols-2 gap-4">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-red-deep/8 bg-red-deep/3">
            <h2 className="font-display font-bold text-red-deep">Desglose de Pagos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider bg-cream/60">
                <th className="text-left px-5 py-2.5 font-semibold">Método</th>
                <th className="text-right px-3 py-2.5 font-semibold">Monto</th>
                <th className="text-right px-3 py-2.5 font-semibold">%</th>
                <th className="text-right px-5 py-2.5 font-semibold">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagos.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-cream/30' : ''}>
                  <td className="px-5 py-2.5 font-medium text-gray-700">
                    {METODOS_PAGO_LABELS[p.metodo] || p.metodo}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-800 font-medium">
                    {ARS(p.monto)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500 text-xs">
                    {totalPagos > 0 ? ((p.monto / totalPagos) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-600">
                    {p.cantidad_transacciones}
                  </td>
                </tr>
              ))}
              {/* Total */}
              <tr className="border-t-2 border-red-deep/15 bg-red-deep/3">
                <td className="px-5 py-3 font-bold text-red-deep">Total</td>
                <td className="px-3 py-3 text-right font-bold text-red-deep">{ARS(totalPagos)}</td>
                <td className="px-3 py-3 text-right font-bold text-gray-600">100%</td>
                <td className="px-5 py-3 text-right font-bold text-gray-600">
                  {pagos.reduce((s, p) => s + p.cantidad_transacciones, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-display font-bold text-red-deep mb-3">Distribución</h2>
          <DonutPagos pagos={pagos} />
        </div>
      </motion.div>

      {/* Imagen del ticket (si aplica) */}
      {arqueo.imagen_url && (
        <motion.div variants={item} className="glass-card p-5">
          <h2 className="font-display font-bold text-red-deep mb-3">Foto del Ticket</h2>
          <img
            src={`${import.meta.env.VITE_API_URL}${arqueo.imagen_url}`}
            alt="Ticket"
            className="rounded-ui max-h-96 object-contain w-full border border-gray-100"
          />
        </motion.div>
      )}
    </motion.div>
  )
}
