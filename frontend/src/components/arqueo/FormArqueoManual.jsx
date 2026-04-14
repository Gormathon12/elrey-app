import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import Button from '../ui/Button'
import { METODOS_PAGO_LABELS } from '../../data/mockData'
import { useAuthStore } from '../../store/authStore'
import { useSucursales } from '../../hooks/useArqueos'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n ?? 0)

const METODOS_ORDER = ['efectivo', 'qr_mp', 'qr_naranja', 'credito', 'debito', 'otro']

const semaforo = (dif) => {
  const abs = Math.abs(dif)
  if (abs < 500)  return 'text-emerald-600'
  if (abs < 5000) return 'text-amber-600'
  return 'text-red-mid'
}

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDDMMYYYY(s) {
  if (!s || !s.includes('/')) return null
  const [d, m, y] = s.split('/')
  return `${y}-${m}-${d}`
}

export default function FormArqueoManual({ datosOCR, imagenPath, onGuardado, onClose }) {
  const { user }      = useAuthStore()
  const { sucursales } = useSucursales()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const now = new Date()
  const defaultApertura = toDatetimeLocal(now.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00'))
  const defaultCierre   = defaultApertura

  const [form, setForm] = useState({
    sucursal_id:    user?.sucursal_id || '',
    cajero_nombre:  user?.nombre || '',
    fecha_apertura: defaultApertura,
    fecha_cierre:   defaultCierre,
    monto_inicial:  '',
    ventas_efectivo:'',
    total_real:     '',
    monto_retiro:   '',
    pagos: METODOS_ORDER.reduce((acc, m) => ({ ...acc, [m]: { monto: '', transacciones: '' } }), {}),
  })

  // Pre-llenar desde OCR
  useEffect(() => {
    if (!datosOCR) return
    const fecha = datosOCR.fecha ? fromDDMMYYYY(datosOCR.fecha) : null

    const buildDatetime = (dateStr, timeStr) => {
      if (!dateStr || !timeStr) return ''
      return `${dateStr}T${timeStr}:00`
    }

    setForm((prev) => ({
      ...prev,
      cajero_nombre:  datosOCR.cajero || prev.cajero_nombre,
      fecha_apertura: buildDatetime(fecha, datosOCR.apertura) || prev.fecha_apertura,
      fecha_cierre:   buildDatetime(fecha, datosOCR.cierre)   || prev.fecha_cierre,
      monto_inicial:  datosOCR.monto_inicial  ?? prev.monto_inicial,
      ventas_efectivo:datosOCR.ventas_efectivo ?? prev.ventas_efectivo,
      total_real:     datosOCR.total_real     ?? prev.total_real,
      pagos: {
        efectivo:   { monto: datosOCR.pagos?.efectivo?.monto         ?? '', transacciones: datosOCR.pagos?.efectivo?.transacciones         ?? '' },
        qr_mp:      { monto: datosOCR.pagos?.qr_mercado_pago?.monto  ?? '', transacciones: datosOCR.pagos?.qr_mercado_pago?.transacciones  ?? '' },
        qr_naranja: { monto: datosOCR.pagos?.qr_naranja?.monto       ?? '', transacciones: datosOCR.pagos?.qr_naranja?.transacciones       ?? '' },
        credito:    { monto: datosOCR.pagos?.tarjeta_credito?.monto   ?? '', transacciones: datosOCR.pagos?.tarjeta_credito?.transacciones   ?? '' },
        debito:     { monto: datosOCR.pagos?.tarjeta_debito?.monto    ?? '', transacciones: datosOCR.pagos?.tarjeta_debito?.transacciones    ?? '' },
        otro:       { monto: datosOCR.pagos?.otro?.monto              ?? '', transacciones: datosOCR.pagos?.otro?.transacciones              ?? '' },
      },
    }))
  }, [datosOCR])

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }))
  const setPago = (metodo, field, value) =>
    setForm((p) => ({ ...p, pagos: { ...p.pagos, [metodo]: { ...p.pagos[metodo], [field]: value } } }))

  const montoInicial   = parseFloat(form.monto_inicial)   || 0
  const ventasEfectivo = parseFloat(form.ventas_efectivo) || 0
  const totalEsperado  = montoInicial + ventasEfectivo
  const totalReal      = parseFloat(form.total_real) || 0
  const montoRetiro    = parseFloat(form.monto_retiro) || 0
  const montoEnCaja    = totalReal - montoRetiro
  const diferencia     = totalReal - totalEsperado

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.sucursal_id) { setError('Seleccioná una sucursal.'); return }
    setSaving(true)
    setError(null)

    const pagosPayload = METODOS_ORDER
      .filter((m) => form.pagos[m].monto !== '' && parseFloat(form.pagos[m].monto) > 0)
      .map((m) => ({
        metodo: m,
        monto: parseFloat(form.pagos[m].monto) || 0,
        cantidad_transacciones: parseInt(form.pagos[m].transacciones) || 0,
      }))

    try {
      await api.post('/arqueos', {
        sucursal_id:    Number(form.sucursal_id),
        cajero_nombre:  form.cajero_nombre,
        fecha_apertura: new Date(form.fecha_apertura).toISOString(),
        fecha_cierre:   new Date(form.fecha_cierre).toISOString(),
        monto_inicial:  montoInicial,
        ventas_efectivo: ventasEfectivo,
        total_real:     totalReal,
        monto_retiro:   montoRetiro,
        origen:         datosOCR ? 'foto' : 'manual',
        imagen_url:     imagenPath || null,
        pagos:          pagosPayload,
      })
      onGuardado?.()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el arqueo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sucursal y cajero */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sucursal *</label>
          <select
            className="input-field"
            value={form.sucursal_id}
            onChange={(e) => set('sucursal_id', e.target.value)}
            required
          >
            <option value="">Seleccionar...</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cajero</label>
          <input
            className="input-field"
            type="text"
            placeholder="Nombre del cajero"
            value={form.cajero_nombre}
            onChange={(e) => set('cajero_nombre', e.target.value)}
          />
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Apertura</label>
          <input
            className="input-field"
            type="datetime-local"
            value={form.fecha_apertura}
            onChange={(e) => set('fecha_apertura', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Cierre</label>
          <input
            className="input-field"
            type="datetime-local"
            value={form.fecha_cierre}
            onChange={(e) => set('fecha_cierre', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Monto Inicial ($)</label>
          <input
            className="input-field"
            type="number"
            step="0.01"
            placeholder="30000"
            value={form.monto_inicial}
            onChange={(e) => set('monto_inicial', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ventas Efectivo ($)</label>
          <input
            className="input-field"
            type="number"
            step="0.01"
            placeholder="0"
            value={form.ventas_efectivo}
            onChange={(e) => set('ventas_efectivo', e.target.value)}
          />
        </div>
      </div>

      {/* Total esperado (calculado) */}
      <div className="bg-cream rounded-ui px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Total Esperado (calculado)</span>
        <span className="text-base font-bold text-red-deep font-display">{ARS(totalEsperado)}</span>
      </div>

      <div>
        <label className="label">Total Real en Caja ($)</label>
        <input
          className="input-field"
          type="number"
          step="0.01"
          placeholder="0"
          value={form.total_real}
          onChange={(e) => set('total_real', e.target.value)}
        />
      </div>

      {/* Diferencia semáforo */}
      {form.total_real !== '' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-ui border"
          style={{ borderColor: Math.abs(diferencia) < 500 ? '#D1FAE5' : Math.abs(diferencia) < 5000 ? '#FEF3C7' : '#FEE2E2' }}
        >
          <span className="text-sm font-medium text-gray-600">Diferencia</span>
          <span className={`text-lg font-bold font-display ${semaforo(diferencia)}`}>
            {ARS(diferencia)}
          </span>
        </motion.div>
      )}

      {/* Retiro y resto en caja */}
      <div className="border border-dashed border-red-deep/30 rounded-ui p-4 space-y-3 bg-red-deep/3">
        <p className="text-xs font-semibold text-red-deep uppercase tracking-wide">Retiro y cierre de caja</p>
        <div>
          <label className="label">Monto retirado para depósito ($)</label>
          <input
            className="input-field"
            type="number"
            step="0.01"
            placeholder="0"
            value={form.monto_retiro}
            onChange={(e) => set('monto_retiro', e.target.value)}
          />
        </div>
        {form.monto_retiro !== '' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-ui px-3 py-2.5 text-center">
              <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide mb-0.5">Retiro</p>
              <p className="text-base font-bold font-display text-amber-700">{ARS(montoRetiro)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-ui px-3 py-2.5 text-center">
              <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide mb-0.5">Queda en caja</p>
              <p className="text-base font-bold font-display text-emerald-700">{ARS(montoEnCaja)}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Formas de pago */}
      <div>
        <label className="label">Formas de Pago (opcional)</label>
        <div className="space-y-2">
          {METODOS_ORDER.map((metodo) => (
            <div key={metodo} className="grid grid-cols-[1fr_100px_80px] gap-2 items-center">
              <span className="text-xs font-medium text-gray-600 truncate">
                {METODOS_PAGO_LABELS[metodo]}
              </span>
              <input
                className="input-field text-xs"
                type="number"
                step="0.01"
                placeholder="Monto"
                value={form.pagos[metodo].monto}
                onChange={(e) => setPago(metodo, 'monto', e.target.value)}
              />
              <input
                className="input-field text-xs"
                type="number"
                placeholder="Tx"
                value={form.pagos[metodo].transacciones}
                onChange={(e) => setPago(metodo, 'transacciones', e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Monto en $ · Tx = cantidad de transacciones</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-ui px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" loading={saving} className="w-full">
        Guardar Arqueo
      </Button>
    </form>
  )
}
