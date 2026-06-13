import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import Button from '../ui/Button'
import { METODOS_PAGO_LABELS } from '../../data/mockData'
import { useAuthStore } from '../../store/authStore'
import { useSucursales } from '../../hooks/useArqueos'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n ?? 0)

const METODOS_ORDER = ['efectivo', 'qr_mp', 'qr_naranja', 'credito', 'debito', 'transferencia', 'vale_empleados', 'otro']

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
  const pad = (n) => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}

const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')

/** Matchea el nombre de sucursal leído del ticket contra la lista real → id */
function matchSucursalId(nombre, sucursales) {
  if (!nombre || !sucursales?.length) return ''
  const n = norm(nombre)
  const exact = sucursales.find((s) => norm(s.nombre) === n)
  if (exact) return String(exact.id)
  const partial = sucursales.find((s) => n.includes(norm(s.nombre)) || norm(s.nombre).includes(n))
  return partial ? String(partial.id) : ''
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
    egresos:        [],
    pagos: METODOS_ORDER.reduce((acc, m) => ({ ...acc, [m]: { monto: '', transacciones: '' } }), {}),
  })

  // Pre-llenar desde OCR (se re-ejecuta también cuando cargan las sucursales)
  useEffect(() => {
    if (!datosOCR) return
    const fecha = datosOCR.fecha ? fromDDMMYYYY(datosOCR.fecha) : null

    const buildDatetime = (dateStr, timeStr) => {
      if (!dateStr || !timeStr) return ''
      return `${dateStr}T${timeStr}:00`
    }

    const egresos = Array.isArray(datosOCR.egresos) ? datosOCR.egresos : []
    // Lo que descuenta del saldo esperado es la suma de los egresos discriminados.
    const sumaEgresos = egresos.reduce((s, e) => s + (Number(e?.monto) || 0), 0)
    const totalEgresos = egresos.length ? sumaEgresos : (Number(datosOCR.total_egresos) || 0)

    setForm((prev) => ({
      ...prev,
      // La sucursal se lee del ticket si no estaba previamente seleccionada
      sucursal_id:    prev.sucursal_id || matchSucursalId(datosOCR.sucursal, sucursales),
      cajero_nombre:  datosOCR.cajero || prev.cajero_nombre,
      fecha_apertura: buildDatetime(fecha, datosOCR.apertura) || prev.fecha_apertura,
      fecha_cierre:   buildDatetime(fecha, datosOCR.cierre)   || prev.fecha_cierre,
      monto_inicial:  datosOCR.monto_inicial  ?? prev.monto_inicial,
      ventas_efectivo:datosOCR.ventas_efectivo ?? prev.ventas_efectivo,
      total_real:     datosOCR.total_real     ?? prev.total_real,
      monto_retiro:   totalEgresos,
      egresos,
      pagos: {
        efectivo:   { monto: datosOCR.pagos?.efectivo?.monto         ?? '', transacciones: datosOCR.pagos?.efectivo?.transacciones         ?? '' },
        qr_mp:      { monto: datosOCR.pagos?.qr_mercado_pago?.monto  ?? '', transacciones: datosOCR.pagos?.qr_mercado_pago?.transacciones  ?? '' },
        qr_naranja: { monto: datosOCR.pagos?.qr_naranja?.monto       ?? '', transacciones: datosOCR.pagos?.qr_naranja?.transacciones       ?? '' },
        credito:    { monto: datosOCR.pagos?.tarjeta_credito?.monto   ?? '', transacciones: datosOCR.pagos?.tarjeta_credito?.transacciones   ?? '' },
        debito:     { monto: datosOCR.pagos?.tarjeta_debito?.monto    ?? '', transacciones: datosOCR.pagos?.tarjeta_debito?.transacciones    ?? '' },
        transferencia:  { monto: datosOCR.pagos?.transferencia?.monto  ?? '', transacciones: datosOCR.pagos?.transferencia?.transacciones  ?? '' },
        vale_empleados: { monto: datosOCR.pagos?.vale_empleados?.monto ?? '', transacciones: datosOCR.pagos?.vale_empleados?.transacciones ?? '' },
        otro:       { monto: datosOCR.pagos?.otro?.monto              ?? '', transacciones: datosOCR.pagos?.otro?.transacciones              ?? '' },
      },
    }))
  }, [datosOCR, sucursales])

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }))
  const setPago = (metodo, field, value) =>
    setForm((p) => ({ ...p, pagos: { ...p.pagos, [metodo]: { ...p.pagos[metodo], [field]: value } } }))

  const montoInicial   = parseFloat(form.monto_inicial)   || 0
  const ventasEfectivo = parseFloat(form.ventas_efectivo) || 0
  const montoRetiro    = parseFloat(form.monto_retiro) || 0
  // Saldo Esperado = Inicial + Ventas Efectivo − Retiro (total de egresos)
  const totalEsperado  = montoInicial + ventasEfectivo - montoRetiro
  const totalReal      = parseFloat(form.total_real) || 0
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

      {/* Egresos — por foto: discriminados del ticket; manual: campo editable */}
      {datosOCR ? (
        <div className="border border-amber-200 bg-amber-50 rounded-ui p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Egresos (retiro de caja)</span>
            <span className="text-[10px] text-amber-600">leído del ticket</span>
          </div>
          {form.egresos.length > 0 ? (
            <ul className="space-y-1">
              {form.egresos.map((e, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{e?.concepto || 'Egreso'}</span>
                  <span className="font-medium text-amber-700 font-display">− {ARS(Number(e?.monto) || 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Sin egresos en el ticket.</p>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-amber-200">
            <span className="text-sm font-semibold text-amber-800">Total egresos</span>
            <span className="text-base font-bold text-amber-800 font-display">− {ARS(montoRetiro)}</span>
          </div>
        </div>
      ) : (
        <div>
          <label className="label">Retiro de caja / depósito ($) — opcional</label>
          <input
            className="input-field"
            type="number"
            step="0.01"
            placeholder="0"
            value={form.monto_retiro}
            onChange={(e) => set('monto_retiro', e.target.value)}
          />
          <p className="text-[10px] text-gray-400 mt-1">Se descuenta del saldo esperado.</p>
        </div>
      )}

      {/* Total esperado (calculado) — Inicial + Ventas Efectivo − Retiro */}
      <div className="bg-cream rounded-ui px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Saldo Esperado (calculado)</span>
          <span className="text-base font-bold text-red-deep font-display">{ARS(totalEsperado)}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Inicial {ARS(montoInicial)} + Ventas {ARS(ventasEfectivo)} − Retiro {ARS(montoRetiro)}
        </p>
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
