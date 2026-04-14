import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HomeIcon, ClipboardDocumentListIcon,
  BuildingStorefrontIcon, PlusCircleIcon,
} from '@heroicons/react/24/outline'

const NAV_ITEMS = [
  { to: '/',          icon: HomeIcon,                     label: 'Inicio'   },
  { to: '/historial', icon: ClipboardDocumentListIcon,    label: 'Historial'},
  { to: '/red',       icon: BuildingStorefrontIcon,       label: 'Red'      },
]

export default function BottomNav({ onNewArqueo }) {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                    bg-white/95 backdrop-blur-card border-t border-red-deep/10
                    safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center py-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2
                             w-8 h-1 bg-red-deep rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={`w-6 h-6 transition-colors ${isActive ? 'text-red-deep' : 'text-gray-400'}`}
              />
              <span className={`text-[10px] mt-0.5 font-medium transition-colors
                               ${isActive ? 'text-red-deep' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </NavLink>
          )
        })}

        {/* FAB Nuevo Arqueo */}
        {onNewArqueo && (
          <button
            onClick={onNewArqueo}
            className="flex-1 flex flex-col items-center py-1"
          >
            <PlusCircleIcon className="w-6 h-6 text-red-deep" />
            <span className="text-[10px] mt-0.5 font-medium text-red-deep">Arqueo</span>
          </button>
        )}
      </div>
    </nav>
  )
}
