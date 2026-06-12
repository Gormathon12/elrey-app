import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import CargaFotoTicket from '../components/arqueo/CargaFotoTicket'
import FormArqueoManual from '../components/arqueo/FormArqueoManual'
import { TendenciaLine, SucursalBars, DIAS } from '../components/charts/EditorialCharts'
import { useArqueos, useSucursales } from '../hooks/useArqueos'
import { useAuthStore } from '../store/authStore'
import { exportarExcel } from '../services/excelExport'
import api from '../services/api'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n ?? 0)

const ARSk = (n) => {
  const v = n ?? 0
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}k`
  return ARS(v)
}

/** "El Rey 1" → "ER 1" */
const shortSucursal = (nombre = '') => {
  const m = nombre.match(/\d+/)
  return m ? `ER ${m[0]}` : nombre.slice(0, 5)
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [selectedSucursal, setSelectedSucursal] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState('foto')
  const [datosOCR, setDatosOCR] = useState(null)
  const [imagenPath, setImagenPath] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)

  const filters = selectedSucursal ? { sucursal_id: selectedSucursal } : {}
  const { arqueos, resumenHoy, loading, refetch } = useArqueos(filters)
  const { sucursales } = useSucursales()

  const esGestor = user?.rol === 'dueno' || user?.rol === 'encargado'

  // ── Datos derivados para el dashboard editorial ──
  const ventasTotales = resumenHoy?.total_ventas ?? 0
  const arqueosCargados = resumenHoy?.arqueos_cargados ?? 0
  const sucursalesActivas = resumenHoy?.sucursales_activas ?? sucursales.length ?? 0
  const difPromedio = resumenHoy?.promedio_diferencia ?? 0
  const progreso = sucursalesActivas ? Math.round((arqueosCargados / sucursalesActivas) * 100) : 0

  const alertasList = useMemo(
    () => arqueos.filter((a) => a.estado && a.estado !== 'ok').slice(0, 4),
    [arqueos],
  )

  // Ventas por sucursal (barras)
  const barsData = useMemo(() => {
    const totales = new Map()
    for (const a of arqueos) {
      totales.set(a.sucursal_id, (totales.get(a.sucursal_id) || 0) + (a.ventas_efectivo || 0))
    }
    const base = sucursales.length
      ? sucursales
      : [...totales.keys()].map((id) => ({ id, nombre: `Sucursal ${id}` }))
    return base.map((s) => ({
      label: shortSucursal(s.nombre),
      full: s.nombre,
      value: totales.get(s.id) || 0,
    }))
  }, [arqueos, sucursales])

  // Tendencia de los últimos 7 días con datos
  const trendData = useMemo(() => {
    const porDia = new Map()
    for (const a of arqueos) {
      if (!a.fecha_cierre) continue
      const d = new Date(a.fecha_cierre)
      const key = d.toISOString().slice(0, 10)
      const prev = porDia.get(key) || { value: 0, day: d.getDay() }
      porDia.set(key, { value: prev.value + (a.ventas_efectivo || 0), day: d.getDay() })
    }
    return [...porDia.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-7)
      .map(([, { value, day }]) => ({ label: DIAS[(day + 6) % 7], value }))
  }, [arqueos])

  const promSemanal = trendData.length
    ? trendData.reduce((s, p) => s + p.value, 0) / trendData.length
    : 0

  // ── Handlers ──
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

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-8">

      {/* ── Encabezado editorial + selector ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="ed-title text-3xl text-ink">Visión General</h2>
          <p className="ed-label mt-1">Resumen consolidado</p>
        </div>
        {esGestor && (
          <div className="relative w-full md:w-64">
            <select
              value={selectedSucursal || ''}
              onChange={(e) => setSelectedSucursal(e.target.value ? Number(e.target.value) : null)}
              className="w-full appearance-none bg-transparent border-b border-ink-soft text-ink
                         ed-label py-2 pl-0 pr-8 focus:outline-none focus:border-red-deep
                         transition-colors cursor-pointer rounded-none"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-ink-soft">
              <span className="material-symbols-outlined text-base">expand_more</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="ed-card h-40 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="ed-card h-28 animate-pulse" />
            <div className="ed-card h-28 animate-pulse" />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          {/* ── Hero: Ventas Totales ── */}
          <div className="ed-card ed-card-accent p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="ed-title text-xl text-ink">Ventas Totales</h3>
                <p className="ed-label text-[10px] mt-1">Acumulado del día</p>
              </div>
              <div className="flex items-center gap-1 border border-copper/30 px-2 py-1 text-red-deep">
                <span className="material-symbols-outlined text-[14px]">store</span>
                <span className="font-mono text-[12px] font-medium">{sucursalesActivas} suc.</span>
              </div>
            </div>
            <p className="ed-title text-5xl md:text-6xl text-ink tracking-tighter relative z-10">
              {ARS(ventasTotales)}
            </p>
            <div className="absolute -bottom-10 -right-10 text-line opacity-30 pointer-events-none">
              <span className="material-symbols-outlined text-[150px]">payments</span>
            </div>
          </div>

          {/* ── Métricas secundarias ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="ed-card p-4 flex flex-col justify-between">
              <h3 className="ed-label mb-4">Arqueos Hoy</h3>
              <div className="flex items-baseline gap-2">
                <span className="ed-title text-3xl text-ink">{arqueosCargados}</span>
                <span className="font-mono text-sm text-ink-soft">/ {sucursalesActivas}</span>
              </div>
              <div className="w-full bg-line h-1 mt-3 relative">
                <div className="bg-red-deep h-1 absolute left-0" style={{ width: `${progreso}%` }} />
              </div>
              <p className="ed-label text-[10px] mt-3 truncate">
                {arqueosCargados >= sucursalesActivas ? 'Todas cargadas' : `Faltan ${sucursalesActivas - arqueosCargados}`}
              </p>
            </div>

            <div className="ed-card p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="ed-label">Dif. Promedio</h3>
                <span className="material-symbols-outlined text-copper text-base">balance</span>
              </div>
              <div>
                <p className={`ed-title text-3xl tracking-tight ${difPromedio < 0 ? 'text-red-mid' : 'text-ink'}`}>
                  {ARS(difPromedio)}
                </p>
                <p className="ed-label text-[10px] mt-2">Rango: ±$500</p>
              </div>
            </div>
          </div>

          {/* ── Alertas ── */}
          {alertasList.length > 0 && (
            <div className="ed-card border-l-4 border-l-error p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-error text-lg icon-fill">warning</span>
                <h3 className="ed-label text-error">Alertas Activas ({alertasList.length})</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {alertasList.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-error flex-shrink-0" />
                    <span className="text-sm text-ink">
                      {a.estado === 'critico' ? 'Diferencia alta' : 'Revisar arqueo'} ·{' '}
                      {a.sucursal?.nombre || shortSucursal(`Sucursal ${a.sucursal_id}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Gráficos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tendencia semanal */}
            <div className="ed-card p-6 lg:col-span-2 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="ed-title text-xl text-ink">Tendencia Semanal</h3>
                  <p className="ed-label text-[10px] mt-1">Últimos 7 días</p>
                </div>
                <span className="font-mono text-sm font-semibold text-red-deep">
                  Prom: {ARSk(promSemanal)}
                </span>
              </div>
              <TendenciaLine points={trendData} />
            </div>

            {/* Por sucursal */}
            <div className="ed-card p-6 lg:col-span-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="ed-title text-xl text-ink">Por Sucursal</h3>
                  <p className="ed-label text-[10px] mt-1">Desglose de ventas</p>
                </div>
                <span className="material-symbols-outlined text-copper text-base">store</span>
              </div>
              <SucursalBars data={barsData} format={ARSk} />
            </div>
          </div>

          {/* ── Arqueos recientes ── */}
          {arqueos.length > 0 && (
            <div className="ed-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h3 className="ed-title text-xl text-ink">Arqueos Recientes</h3>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="flex items-center gap-1.5 ed-label text-red-deep border border-red-deep/30
                             px-3 py-1.5 hover:bg-red-deep/5 transition-colors disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="ed-label text-[10px] border-b border-line">
                      <th className="text-left px-5 py-3">Fecha</th>
                      <th className="text-left px-3 py-3 hidden md:table-cell">Sucursal</th>
                      <th className="text-left px-3 py-3 hidden md:table-cell">Cajero</th>
                      <th className="text-right px-3 py-3">Ventas</th>
                      <th className="text-right px-3 py-3">Diferencia</th>
                      <th className="text-center px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arqueos.slice(0, 8).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-line/60 hover:bg-cream/60 transition-colors cursor-pointer"
                        onClick={() => (window.location.href = `/arqueo/${a.id}`)}
                      >
                        <td className="px-5 py-3 text-ink-soft font-mono text-xs">
                          {new Date(a.fecha_cierre).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-3 py-3 text-ink-soft hidden md:table-cell">{a.sucursal?.nombre}</td>
                        <td className="px-3 py-3 text-ink-soft hidden md:table-cell">
                          {a.cajero?.nombre || a.cajero_nombre}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-ink">{ARS(a.ventas_efectivo)}</td>
                        <td className={`px-3 py-3 text-right font-mono font-semibold ${a.diferencia >= 0 ? 'text-emerald-600' : 'text-red-mid'}`}>
                          {ARS(a.diferencia)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge estado={a.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── FAB nuevo arqueo ── */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 20 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => { setModalTab('foto'); setShowModal(true) }}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-30
                   w-14 h-14 bg-red-deep text-white rounded-full shadow-lg
                   flex items-center justify-center hover:bg-red-mid transition-colors"
        aria-label="Nuevo arqueo"
      >
        <PlusIcon className="w-7 h-7" />
      </motion.button>

      {/* ── Modal nuevo arqueo ── */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setDatosOCR(null) }}
        title="Nuevo Arqueo"
        size="lg"
      >
        <div className="flex gap-1 bg-gray-100 p-1 rounded-ui mb-5">
          {[
            { id: 'foto', label: '📷 Foto del Ticket' },
            { id: 'manual', label: '✏️ Carga Manual' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModalTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all duration-150
                          ${modalTab === tab.id ? 'bg-white text-red-deep shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {modalTab === 'foto' ? (
            <motion.div key="foto" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
              <CargaFotoTicket onDatosExtraidos={onDatosExtraidos} />
            </motion.div>
          ) : (
            <motion.div key="manual" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
              {datosOCR && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-ui px-3 py-2 mb-4 text-xs text-emerald-700">
                  <span>✅</span>
                  <span>Datos extraídos del ticket con IA. Revisá y confirmá antes de guardar.</span>
                </div>
              )}
              <FormArqueoManual datosOCR={datosOCR} imagenPath={imagenPath} onGuardado={onGuardado} onClose={() => setShowModal(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  )
}
