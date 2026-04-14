import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon, CurrencyDollarIcon, ClipboardDocumentListIcon,
  BuildingStorefrontIcon, Cog6ToothIcon, ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

const NAV_ITEMS = [
  { to: '/',             icon: HomeIcon,                     label: 'Inicio'    },
  { to: '/historial',    icon: ClipboardDocumentListIcon,    label: 'Historial' },
  { to: '/red',          icon: BuildingStorefrontIcon,       label: 'Red'       },
  { to: '/configuracion',icon: Cog6ToothIcon,                label: 'Config',   rol: 'dueno' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const logout = () => { clearAuth(); navigate('/login') }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="hidden md:flex flex-col bg-white/90 backdrop-blur-card border-r
                 border-red-deep/8 shadow-card overflow-hidden flex-shrink-0 z-10"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-red-deep/8">
        <span className="text-2xl flex-shrink-0">🥩</span>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-display font-bold text-red-deep leading-tight">El Rey</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Carnicería</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.rol && user?.rol !== item.rol) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-ui text-sm font-medium
                 transition-all duration-150 group
                 ${isActive
                   ? 'bg-red-deep text-white shadow-sm'
                   : 'text-gray-600 hover:bg-red-deep/8 hover:text-red-deep'
                 }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-red-deep/8 p-3 space-y-1">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-ui text-sm
                     font-medium text-gray-500 hover:bg-red-50 hover:text-red-mid
                     transition-all duration-150"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Toggle collapse */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center w-full py-1.5 text-gray-400
                     hover:text-red-deep transition-colors"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeftIcon className="w-4 h-4" />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  )
}
