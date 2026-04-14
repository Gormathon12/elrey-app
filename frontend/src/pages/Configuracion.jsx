import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import api from '../services/api'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

// ─── Modal usuario ─────────────────────────────────────────────────────────
function ModalUsuario({ open, onClose, usuario, sucursales, onSaved }) {
  const isEdit = !!usuario
  const [form, setForm] = useState({
    nombre: '', username: '', password: '', rol: 'cajero', sucursal_id: '', activo: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (usuario) setForm({ ...usuario, password: '', sucursal_id: usuario.sucursal_id || '' })
    else setForm({ nombre: '', username: '', password: '', rol: 'cajero', sucursal_id: '', activo: true })
  }, [usuario])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, sucursal_id: form.sucursal_id ? Number(form.sucursal_id) : null }
      if (isEdit) {
        if (!payload.password) delete payload.password
        await api.put(`/usuarios/${usuario.id}`, payload)
      } else {
        await api.post('/usuarios', payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nombre *</label>
          <input className="input-field" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
        </div>
        <div>
          <label className="label">Usuario *</label>
          <input className="input-field" type="text" value={form.username} onChange={(e) => set('username', e.target.value)}
            autoCapitalize="none" required />
        </div>
        <div>
          <label className="label">{isEdit ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
          <input className="input-field" type="password" value={form.password}
            onChange={(e) => set('password', e.target.value)} required={!isEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rol *</label>
            <select className="input-field" value={form.rol} onChange={(e) => set('rol', e.target.value)}>
              <option value="cajero">Cajero</option>
              <option value="encargado">Encargado</option>
              <option value="dueno">Dueño</option>
            </select>
          </div>
          <div>
            <label className="label">Sucursal</label>
            <select className="input-field" value={form.sucursal_id} onChange={(e) => set('sucursal_id', e.target.value)}>
              <option value="">Sin sucursal</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)}
            className="w-4 h-4 accent-red-deep" />
          <span className="text-sm text-gray-700">Usuario activo</span>
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-ui px-3 py-2">{error}</p>}
        <Button type="submit" loading={saving} className="w-full">Guardar Usuario</Button>
      </form>
    </Modal>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function Configuracion() {
  const [usuarios, setUsuarios]   = useState([])
  const [sucursales, setSucursales] = useState([])
  const [tab, setTab]             = useState('usuarios')
  const [modalUser, setModalUser] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [telegram, setTelegram]   = useState({ bot_token: '', chat_id: '' })
  const [telegramStatus, setTelegramStatus] = useState(null)
  const [testing, setTesting]     = useState(false)
  const [umbralAlerta, setUmbralAlerta]   = useState(500)
  const [umbralCritico, setUmbralCritico] = useState(5000)

  const loadData = async () => {
    const [uRes, sRes] = await Promise.all([
      api.get('/usuarios').catch(() => ({ data: [] })),
      api.get('/sucursales').catch(() => ({ data: [] })),
    ])
    setUsuarios(uRes.data)
    setSucursales(sRes.data)
  }

  useEffect(() => { loadData() }, [])

  const toggleSucursal = async (suc) => {
    await api.put(`/sucursales/${suc.id}`, { activa: !suc.activa })
    loadData()
  }

  const desactivarUsuario = async (id) => {
    if (!window.confirm('¿Desactivar este usuario?')) return
    await api.delete(`/usuarios/${id}`)
    loadData()
  }

  const testTelegram = async () => {
    setTesting(true)
    setTelegramStatus(null)
    try {
      const res = await api.post(
        `/ocr/test-telegram?bot_token=${encodeURIComponent(telegram.bot_token)}&chat_id=${encodeURIComponent(telegram.chat_id)}`
      )
      setTelegramStatus({ ok: res.data.success, msg: res.data.detail })
    } catch (e) {
      setTelegramStatus({ ok: false, msg: e.response?.data?.detail || 'Error de conexión' })
    } finally {
      setTesting(false)
    }
  }

  const TABS = [
    { id: 'usuarios',    label: '👤 Usuarios'   },
    { id: 'sucursales',  label: '🏬 Sucursales' },
    { id: 'telegram',    label: '📱 Telegram'   },
    { id: 'umbrales',    label: '⚙️ Umbrales'   },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl mx-auto">

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 bg-white/60 p-1 rounded-card overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-ui text-sm font-medium transition-all duration-150
                        ${tab === t.id ? 'bg-red-deep text-white shadow-sm' : 'text-gray-600 hover:text-red-deep'}`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ─── USUARIOS ──────────────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-deep/8">
            <h2 className="font-display font-bold text-red-deep">Usuarios</h2>
            <Button size="sm" onClick={() => { setEditUser(null); setModalUser(true) }}>
              <PlusIcon className="w-4 h-4" /> Nuevo Usuario
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider bg-cream/60">
                  <th className="text-left px-5 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Usuario</th>
                  <th className="text-left px-3 py-3 font-semibold">Rol</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Sucursal</th>
                  <th className="text-center px-3 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-cream/30' : ''}>
                    <td className="px-5 py-3 font-medium text-gray-800">{u.nombre}</td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell">{u.username}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${u.rol === 'dueno' ? 'bg-red-deep/10 text-red-deep'
                          : u.rol === 'encargado' ? 'bg-earth/30 text-brown-light'
                          : 'bg-gray-100 text-gray-600'}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                      {sucursales.find((s) => s.id === u.sucursal_id)?.nombre || '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`w-2 h-2 rounded-full inline-block ${u.activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditUser(u); setModalUser(true) }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-deep transition-colors">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => desactivarUsuario(u.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-mid transition-colors">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── SUCURSALES ────────────────────────────────────────────────────── */}
      {tab === 'sucursales' && (
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-red-deep/8">
            <h2 className="font-display font-bold text-red-deep">Sucursales</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {sucursales.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-800">{s.nombre}</p>
                  <p className="text-xs text-gray-400">{s.direccion}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.activa}
                    onChange={() => toggleSucursal(s)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-deep/20
                                  rounded-full peer peer-checked:bg-red-deep transition-colors after:content-['']
                                  after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full
                                  after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── TELEGRAM ──────────────────────────────────────────────────────── */}
      {tab === 'telegram' && (
        <motion.div variants={item} className="glass-card p-6 space-y-5">
          <h2 className="font-display font-bold text-red-deep">Configuración Telegram</h2>
          <p className="text-sm text-gray-500">
            Configurá tu Bot de Telegram para recibir alertas cuando hay diferencias de caja.
            Estas credenciales se usan para enviar notificaciones. Para configuración permanente,
            editá el archivo <code className="bg-gray-100 px-1 rounded text-xs">backend/.env</code>.
          </p>
          <div>
            <label className="label">Bot Token</label>
            <input className="input-field font-mono text-xs" placeholder="1234567890:ABCdef..."
              value={telegram.bot_token} onChange={(e) => setTelegram((t) => ({ ...t, bot_token: e.target.value }))} />
          </div>
          <div>
            <label className="label">Chat ID</label>
            <input className="input-field font-mono" placeholder="-1001234567890"
              value={telegram.chat_id} onChange={(e) => setTelegram((t) => ({ ...t, chat_id: e.target.value }))} />
          </div>
          {telegramStatus && (
            <div className={`flex items-center gap-2 rounded-ui px-4 py-3 text-sm
              ${telegramStatus.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {telegramStatus.ok ? <CheckIcon className="w-4 h-4" /> : '✗'}
              {telegramStatus.msg}
            </div>
          )}
          <Button
            loading={testing}
            disabled={!telegram.bot_token || !telegram.chat_id}
            onClick={testTelegram}
          >
            📱 Probar Notificación
          </Button>
        </motion.div>
      )}

      {/* ─── UMBRALES ──────────────────────────────────────────────────────── */}
      {tab === 'umbrales' && (
        <motion.div variants={item} className="glass-card p-6 space-y-6">
          <h2 className="font-display font-bold text-red-deep">Umbrales de Alerta</h2>
          <p className="text-sm text-gray-500">
            Definí a partir de qué diferencia de caja se considera alerta o crítico.
          </p>
          <div className="space-y-5">
            <div>
              <label className="label">
                Umbral ALERTA — diferencia &gt; ${umbralAlerta.toLocaleString('es-AR')}
              </label>
              <input
                type="range"
                min={100} max={10000} step={100}
                value={umbralAlerta}
                onChange={(e) => setUmbralAlerta(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$100</span><span>$10.000</span>
              </div>
            </div>
            <div>
              <label className="label">
                Umbral CRÍTICO — diferencia &gt; ${umbralCritico.toLocaleString('es-AR')}
              </label>
              <input
                type="range"
                min={1000} max={50000} step={500}
                value={umbralCritico}
                onChange={(e) => setUmbralCritico(Number(e.target.value))}
                className="w-full accent-red-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$1.000</span><span>$50.000</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-cream rounded-ui">
            <div className="flex-1 text-center border-r border-gray-200">
              <p className="text-2xl">🟡</p>
              <p className="text-xs text-gray-500 mt-1">Alerta si dif &gt;</p>
              <p className="font-bold text-amber-600">${umbralAlerta.toLocaleString('es-AR')}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-2xl">🔴</p>
              <p className="text-xs text-gray-500 mt-1">Crítico si dif &gt;</p>
              <p className="font-bold text-red-mid">${umbralCritico.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Para aplicar estos umbrales en el servidor, actualizá las variables
            <code className="bg-gray-100 px-1 rounded mx-1">UMBRAL_ALERTA</code> y
            <code className="bg-gray-100 px-1 rounded ml-1">UMBRAL_CRITICO</code> en
            <code className="bg-gray-100 px-1 rounded ml-1">backend/.env</code>.
          </p>
        </motion.div>
      )}

      {/* Modal usuario */}
      <ModalUsuario
        open={modalUser}
        onClose={() => setModalUser(false)}
        usuario={editUser}
        sucursales={sucursales}
        onSaved={loadData}
      />
    </motion.div>
  )
}
