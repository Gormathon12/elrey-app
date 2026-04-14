import * as XLSX from 'xlsx'
import { METODOS_PAGO_LABELS } from '../data/mockData'

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n ?? 0)

const HEADER_STYLE = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '8B1A1A' } } }
const ALT_ROW_STYLE = { fill: { fgColor: { rgb: 'FAF3EE' } } }

function autoWidth(ws, data) {
  const widths = []
  ;(data || []).forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const len = String(val ?? '').length
      widths[i] = Math.max(widths[i] || 10, Math.min(len + 4, 40))
    })
  })
  ws['!cols'] = widths.map((w) => ({ wch: w }))
}

/**
 * Exporta un array de arqueos (formato JSON del endpoint /arqueos/exportar/excel)
 * a un archivo .xlsx con múltiples hojas.
 */
export function exportarExcel(arqueos, nombreArchivo) {
  const wb = XLSX.utils.book_new()
  const fecha = new Date().toISOString().split('T')[0]
  const filename = nombreArchivo || `ElRey_Arqueos_${fecha}.xlsx`

  // ─── Hoja Resumen ──────────────────────────────────────────────────────────
  const totalVentas  = arqueos.reduce((s, a) => s + (a.ventas_efectivo ?? 0), 0)
  const totalReal    = arqueos.reduce((s, a) => s + (a.total_real ?? 0), 0)
  const totalEsp     = arqueos.reduce((s, a) => s + (a.total_esperado ?? 0), 0)
  const totalDif     = arqueos.reduce((s, a) => s + (a.diferencia ?? 0), 0)
  const alertas      = arqueos.filter((a) => a.estado !== 'ok').length

  const resumenData = [
    ['El Rey Carnicería — Resumen de Arqueos', '', '', ''],
    ['Generado:', new Date().toLocaleString('es-AR'), '', ''],
    [],
    ['Total Arqueos',    arqueos.length,   'Total Ventas',   ARS(totalVentas)],
    ['Total Esperado',  ARS(totalEsp),    'Total Real',     ARS(totalReal)],
    ['Diferencia Red',  ARS(totalDif),    'Alertas/Críticos', alertas],
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // ─── Hoja Detalle completo ─────────────────────────────────────────────────
  const detalleRows = arqueos.map((a) => ({
    Fecha:           new Date(a.fecha_cierre).toLocaleDateString('es-AR'),
    Sucursal:        a.sucursal,
    Cajero:          a.cajero,
    Apertura:        new Date(a.fecha_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    Cierre:          new Date(a.fecha_cierre).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    'Monto Inicial': a.monto_inicial,
    'Ventas Efec.':  a.ventas_efectivo,
    'Esperado':      a.total_esperado,
    'Real en Caja':  a.total_real,
    'Diferencia':    a.diferencia,
    Estado:          a.estado?.toUpperCase(),
    Origen:          a.origen,
  }))

  const wsDetalle = XLSX.utils.json_to_sheet(detalleRows)
  autoWidth(wsDetalle, detalleRows)
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  // ─── Hoja por sucursal ─────────────────────────────────────────────────────
  const porSucursal = {}
  arqueos.forEach((a) => {
    if (!porSucursal[a.sucursal]) porSucursal[a.sucursal] = []
    porSucursal[a.sucursal].push(a)
  })

  Object.entries(porSucursal).forEach(([nombre, arqs]) => {
    const rows = []
    arqs.forEach((a) => {
      // Fila principal
      rows.push({
        Fecha:          new Date(a.fecha_cierre).toLocaleDateString('es-AR'),
        Cajero:         a.cajero,
        'Ventas Efec.': a.ventas_efectivo,
        'Real':         a.total_real,
        'Diferencia':   a.diferencia,
        Estado:         a.estado?.toUpperCase(),
      })
      // Filas de pagos (indentadas)
      ;(a.pagos || []).forEach((p) => {
        rows.push({
          Fecha:          `  → ${METODOS_PAGO_LABELS[p.metodo] || p.metodo}`,
          Cajero:         `${p.transacciones} transacciones`,
          'Ventas Efec.': p.monto,
          'Real':         '',
          'Diferencia':   '',
          Estado:         '',
        })
      })
    })
    const sheetName = nombre.replace(/[:\\/?*[\]]/g, '').slice(0, 31)
    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws, rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  // ─── Hoja Red (comparativa) ───────────────────────────────────────────────
  const redRows = Object.entries(porSucursal).map(([nombre, arqs]) => ({
    Sucursal:      nombre,
    'Nº Arqueos':  arqs.length,
    'Ventas':      arqs.reduce((s, a) => s + a.ventas_efectivo, 0),
    'Real':        arqs.reduce((s, a) => s + a.total_real, 0),
    'Diferencia':  arqs.reduce((s, a) => s + a.diferencia, 0),
    Alertas:       arqs.filter((a) => a.estado !== 'ok').length,
  }))
  const wsRed = XLSX.utils.json_to_sheet(redRows)
  autoWidth(wsRed, redRows)
  XLSX.utils.book_append_sheet(wb, wsRed, 'Red')

  XLSX.writeFile(wb, filename)
}
