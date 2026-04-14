import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Sidebar solo en desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* BottomNav solo en mobile */}
      <BottomNav />
    </div>
  )
}
