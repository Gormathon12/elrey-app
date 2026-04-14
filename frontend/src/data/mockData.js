// Datos mock para preview de gráficos cuando no hay datos reales
export const METODOS_PAGO_LABELS = {
  efectivo:   'Efectivo',
  qr_mp:      'QR Mercado Pago',
  qr_naranja: 'QR Naranja',
  credito:    'Tarjeta Crédito',
  debito:     'Tarjeta Débito',
  otro:       'Otro',
}

export const METODOS_COLORES = {
  efectivo:   '#8B1A1A',
  qr_mp:      '#009EE3',
  qr_naranja: '#FF6900',
  credito:    '#6B4030',
  debito:     '#E8A87C',
  otro:       '#9CA3AF',
}

export const DIAS_SEMANA_ES = {
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mié',
  Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb', Sun: 'Dom',
}

export const mockSemanal = Array.from({ length: 7 }, (_, i) => {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  return {
    dia: dias[i],
    'El Rey 1': Math.round(150000 + Math.random() * 100000),
    'El Rey 2': Math.round(200000 + Math.random() * 150000),
    'El Rey 3': Math.round(120000 + Math.random() * 80000),
  }
})

export const mockArqueoEjemplo = {
  id: 1,
  sucursal: { nombre: 'El Rey 2' },
  cajero: { nombre: 'Axel Ariza' },
  cajero_nombre: 'Axel Ariza',
  fecha_apertura: '2026-04-04T08:58:00',
  fecha_cierre: '2026-04-04T21:55:00',
  monto_inicial: 30000,
  ventas_efectivo: 299041.11,
  total_esperado: 329041.11,
  total_real: 24340,
  diferencia: -304701.11,
  estado: 'critico',
  origen: 'foto',
  pagos_detalle: [
    { metodo: 'efectivo',   monto: 299041.11, cantidad_transacciones: 38 },
    { metodo: 'qr_mp',      monto: 144552.62, cantidad_transacciones: 17 },
    { metodo: 'qr_naranja', monto: 3645.00,   cantidad_transacciones: 1  },
    { metodo: 'credito',    monto: 62174.05,  cantidad_transacciones: 4  },
    { metodo: 'debito',     monto: 75296.03,  cantidad_transacciones: 9  },
    { metodo: 'otro',       monto: 68901.56,  cantidad_transacciones: 7  },
  ],
}
