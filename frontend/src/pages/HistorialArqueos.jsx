import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FunnelIcon, XMarkIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { METODOS_PAGO_LABELS } from '../data/mockData'
import api from '../services/api'
import { exportarExcel } from '../services/excelExport'
import { useSucursales } from '../hooks/useArqueos'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

const PAGE_SIZE = 10

export default function HistorialArqueos() {
  const navigate = useNavigate()
  const { sucursales } = useSucursales()

  const [arqueos, setArqueos]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedArqueo, setSelectedArqueo] = useState(null)
  const [exportLoading, setExportLoading]   = useState(false)

  const [filters, setFilters] = useState({
    sucursal_id: '',
    cajero_id:   '',
    fecha_desde: '',
    fecha_hasta: '',
    estado:      '',
  })

  const fetchArqueos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '200')
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/arqueos?${params}`)
      setArqueos(res.data)
      setPage(1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArqueos() }, [JSON.stringify(filters)])

  const totalPages = Math.max(1, Math.ceil(arqueos.length / PAGE_SIZE))
  const paged = arqueos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () =>
    setFilters({ sucursal_id: '', cajero_id: '', fecha_desde: '', fecha_hasta: '', estado: '' })

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/arqueos/exportar/excel?${params}`)
      exportarExcel(res.data)
    } catch (e) { console.error(e) }
    finally { setExportLoading(false) }
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {hasFilters && <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{Object.values(filters).filter(Boolean).length}</span>}
          </Button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-mid flex items-center gap-1">
              <XMarkIcon className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>
        <Button variant="secondary" size="sm" loading={exportLoading} onClick={handleExport}>
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          Exportar Excel
        </Button>
      </div>

      {/* Panel de filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Sucursal</label>
                <select className="input-field" value={filters.sucursal_id}
                  onChange={(e) => setFilters((f) => ({ ...f, sucursal_id: e.target.value }))}>
                  <option value="">Todas</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="input-field" value={filters.estado}
                  onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="ok">OK</option>
                  <option value="alerta">Alerta</option>
                  <option value="critico">Crítico</option>
                </select>
              </div>
              <div>
                <label className="label">Desde</label>
                <input className="input-field" type="date" value={filters.fecha_desde}
                  onChange={(e) => setFilters((f) => ({ ...f, fecha_desde: e.target.value }))} />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input className="input-field" type="date" value={filters.fecha_hasta}
                  onChange={(e) => setFilters((f) => ({ ...f, fecha_hasta: e.target.value }))} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-deep/8">
          <h2 className="font-display font-bold text-red-deep">
            {arqueos.length} arqueos
          </h2>
          <div className="text-xs text-gray-400">Página {page} de {totalPages}</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-red-deep/20 border-t-red-deep rounded-full animate-spin" />
          </div>
        ) : arqueos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p>No hay arqueos con estos filtros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider bg-cream/60">
                    <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                    <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Sucursal</th>
                    <th className="text-left px-3 py-3 font-semibold hidden lg:table-cell">Cajero</th>
                    <th className="text-right px-3 py-3 font-semibold">Ventas</th>
                    <th className="text-right px-3 py-3 font-semibold hidden md:table-cell">Esperado</th>
                    <th className="text-right px-3 py-3 font-semibold">Diferencia</th>
                    <th className="text-center px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedArqueo(a)}
                      className="hover:bg-red-deep/3 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-700">
                        <p>{new Date(a.fecha_cierre).toLocaleDateString('es-AR')}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(a.fecha_cierre).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-gray-600 hidden md:table-cell">{a.sucursal?.nombre}</td>
                      <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">{a.cajero?.nombre || a.cajero_nombre}</td>
                      <td className="px-3 py-3 text-right font-medium text-gray-800">{ARS(a.ventas_efectivo)}</td>
                      <td className="px-3 py-3 text-right text-gray-600 hidden md:table-cell">{ARS(a.total_esperado)}</td>
                      <td className={`px-3 py-3 text-right font-bold ${a.diferencia >= 0 ? 'text-emerald-600' : 'text-red-mid'}`}>
                        {ARS(a.diferencia)}
                      </td>
                      <td className="px-5 py-3 text-center"><Badge estado={a.estado} /></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <Button
                variant="ghost" size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="w-4 h-4" /> Anterior
              </Button>
              <span className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, arqueos.length)} de {arqueos.length}
              </span>
              <Button
                variant="ghost" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Drawer detalle lateral */}
      <AnimatePresence>
        {selectedArqueo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArqueo(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-cream z-50
                         shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4
                              border-b border-red-deep/10 bg-white/80 backdrop-blur-sm">
                <div>
                  <h3 className="font-display font-bold text-red-deep">
                    Arqueo #{selectedArqueo.id}
                  </h3>
                  <p className="text-xs text-gray-400">{selectedArqueo.sucursal?.nombre}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge estado={selectedArqueo.estado} />
                  <button onClick={() => setSelectedArqueo(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Info */}
                <div className="glass-card p-4 space-y-2 text-sm">
                  {[
                    ['Cajero', selectedArqueo.cajero?.nombre || selectedArqueo.cajero_nombre],
                    ['Apertura', new Date(selectedArqueo.fecha_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
                    ['Cierre', new Date(selectedArqueo.fecha_cierre).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
                    ['Monto Inicial', ARS(selectedArqueo.monto_inicial)],
                    ['Ventas Efectivo', ARS(selectedArqueo.ventas_efectivo)],
                    ['Total Esperado', ARS(selectedArqueo.total_esperado)],
                    ['Real en Caja', ARS(selectedArqueo.total_real)],
                    ['Diferencia', ARS(selectedArqueo.diferencia)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-medium ${label === 'Diferencia' ? (selectedArqueo.diferencia >= 0 ? 'text-emerald-600' : 'text-red-mid') : 'text-gray-800'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagos */}
                {selectedArqueo.pagos_detalle?.length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pagos</p>
                    <div className="space-y-2">
                      {selectedArqueo.pagos_detalle.map((p) => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{METODOS_PAGO_LABELS[p.metodo]}</span>
                          <span className="font-medium text-gray-800">{ARS(p.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-white/50">
                <Button
                  className="w-full"
                  onClick={() => navigate(`/arqueo/${selectedArqueo.id}`)}
                >
                  Ver detalle completo
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
