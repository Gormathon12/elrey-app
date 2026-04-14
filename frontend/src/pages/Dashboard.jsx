import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import StatCard from '../components/ui/StatCard'
import PagoBar from '../components/ui/PagoBar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import DonutPagos from '../components/charts/DonutPagos'
import CargaFotoTicket from '../components/arqueo/CargaFotoTicket'
import FormArqueoManual from '../components/arqueo/FormArqueoManual'
import { useArqueos, useSucursales } from '../hooks/useArqueos'
import { useAuthStore } from '../store/authStore'
import { exportarExcel } from '../services/excelExport'
import api from '../services/api'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

export default function Dashboard() {
  const { user }                            = useAuthStore()
  const [selectedSucursal, setSelectedSucursal] = useState(null)
  const [showModal, setShowModal]           = useState(false)
  const [modalTab, setModalTab]             = useState('foto')
  const [datosOCR, setDatosOCR]             = useState(null)
  const [imagenPath, setImagenPath]         = useState(null)
  const [exportLoading, setExportLoading]   = useState(false)

  const filters = selectedSucursal ? { sucursal_id: selectedSucursal } : {}
  const { arqueos, resumenHoy, loading, refetch } = useArqueos(filters)
  const { sucursales }                      = useSucursales()

  const ultimoArqueo = arqueos[0]
  const pagos        = ultimoArqueo?.pagos_detalle || []
  const totalPagos   = pagos.reduce((s, p) => s + p.monto, 0)

  const onDatosExtraidos = (datos, path) => {
    setDatosOCR(datos)
    setImagenPath(path)
    setModalTab('manual')
  }

  const onGuardado = () => {
    refetch()
    setShowModal(false)
    setDatosOCR(null)
    setImagenPath(null)
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const params = selectedSucursal ? `?sucursal_id=${selectedSucursal}` : ''
      const res = await api.get(`/arqueos/exportar/excel${params}`)
      exportarExcel(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setExportLoading(false)
    }
  }

  const ARS = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

  return (
    <div className="space-y-6">

      {/* Selector de sucursal (mobile) */}
      {(user?.rol === 'dueno' || user?.rol === 'encargado') && (
        <div className="md:hidden">
          <select
            className="input-field"
            value={selectedSucursal || ''}
            onChange={(e) => setSelectedSucursal(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            title="Ventas Efectivo"
            value={ultimoArqueo?.ventas_efectivo ?? resumenHoy?.total_ventas ?? 0}
            icon="💵"
            type="currency"
            index={0}
          />
          <StatCard
            title="Total Esperado"
            value={ultimoArqueo?.total_esperado ?? resumenHoy?.total_esperado ?? 0}
            icon="🧾"
            type="currency"
            index={1}
          />
          <StatCard
            title="Real en Caja"
            value={ultimoArqueo?.total_real ?? resumenHoy?.total_real ?? 0}
            icon="💰"
            type="currency"
            index={2}
          />
          <StatCard
            title="Diferencia"
            value={ultimoArqueo?.diferencia ?? resumenHoy?.promedio_diferencia ?? 0}
            icon={ultimoArqueo?.diferencia >= 0 ? '✅' : '⚠️'}
            type="currency"
            index={3}
          />
        </motion.div>
      )}

      {/* Resumen de Red */}
      {resumenHoy && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                Resumen del Día — Red El Rey
              </p>
              <p className="font-display text-xl font-bold text-red-deep">
                {ARS(resumenHoy.total_ventas)} en ventas
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-gray-800">{resumenHoy.arqueos_cargados}</p>
                <p className="text-xs text-gray-400">Arqueos</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">{resumenHoy.sucursales_activas}</p>
                <p className="text-xs text-gray-400">Sucursales</p>
              </div>
              {resumenHoy.alertas > 0 && (
                <div className="text-center">
                  <p className="font-bold text-red-mid">{resumenHoy.alertas}</p>
                  <p className="text-xs text-gray-400">Alertas</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Último arqueo detail */}
      {ultimoArqueo && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {/* Formas de pago */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-red-deep">Formas de Pago</h3>
              <Badge estado={ultimoArqueo.estado} />
            </div>
            {pagos.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {pagos.map((p) => (
                  <PagoBar
                    key={p.id}
                    metodo={p.metodo}
                    monto={p.monto}
                    total={totalPagos}
                    transacciones={p.cantidad_transacciones}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin detalle de pagos</p>
            )}
          </div>

          {/* Donut + cajero info */}
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-red-deep mb-3">Distribución</h3>
              <DonutPagos pagos={pagos} />
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-deep text-white
                                flex items-center justify-center font-bold text-sm">
                  {(ultimoArqueo.cajero?.nombre || ultimoArqueo.cajero_nombre || 'CA')
                    .split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {ultimoArqueo.cajero?.nombre || ultimoArqueo.cajero_nombre || 'Cajero'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ultimoArqueo.sucursal?.nombre} ·{' '}
                    {new Date(ultimoArqueo.fecha_cierre).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <Badge estado={ultimoArqueo.estado} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista reciente */}
      {arqueos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-deep/8">
            <h3 className="font-display font-bold text-red-deep">Arqueos Recientes</h3>
            <Button
              variant="secondary"
              size="sm"
              loading={exportLoading}
              onClick={handleExport}
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider bg-cream/60">
                  <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Sucursal</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Cajero</th>
                  <th className="text-right px-3 py-3 font-semibold">Ventas</th>
                  <th className="text-right px-3 py-3 font-semibold">Diferencia</th>
                  <th className="text-center px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {arqueos.slice(0, 8).map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-red-deep/3 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/arqueo/${a.id}`}
                  >
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(a.fecha_cierre).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden md:table-cell">
                      {a.sucursal?.nombre}
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden md:table-cell">
                      {a.cajero?.nombre || a.cajero_nombre}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {ARS(a.ventas_efectivo)}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold ${a.diferencia >= 0 ? 'text-emerald-600' : 'text-red-mid'}`}>
                      {ARS(a.diferencia)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge estado={a.estado} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* FAB móvil */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 20 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => { setModalTab('foto'); setShowModal(true) }}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-30
                   w-14 h-14 bg-red-deep text-white rounded-full shadow-lg
                   flex items-center justify-center text-2xl
                   hover:bg-red-mid transition-colors"
      >
        <PlusIcon className="w-7 h-7" />
      </motion.button>

      {/* Modal nuevo arqueo */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setDatosOCR(null) }}
        title="Nuevo Arqueo"
        size="lg"
      >
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-ui mb-5">
          {[
            { id: 'foto',   label: '📷 Foto del Ticket' },
            { id: 'manual', label: '✏️ Carga Manual'    },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModalTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all duration-150
                          ${modalTab === tab.id
                            ? 'bg-white text-red-deep shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {modalTab === 'foto' ? (
            <motion.div
              key="foto"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              <CargaFotoTicket onDatosExtraidos={onDatosExtraidos} />
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {datosOCR && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
                                rounded-ui px-3 py-2 mb-4 text-xs text-emerald-700">
                  <span>✅</span>
                  <span>Datos extraídos del ticket con IA. Revisá y confirmá antes de guardar.</span>
                </div>
              )}
              <FormArqueoManual
                datosOCR={datosOCR}
                imagenPath={imagenPath}
                onGuardado={onGuardado}
                onClose={() => setShowModal(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  )
}
