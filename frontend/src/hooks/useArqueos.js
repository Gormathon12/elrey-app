import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useArqueos(filters = {}) {
  const [arqueos, setArqueos]       = useState([])
  const [resumenHoy, setResumenHoy] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v)
      })

      const [arqueoRes, resumenRes] = await Promise.all([
        api.get(`/arqueos?${params}`),
        api.get(`/arqueos/resumen/hoy${filters.sucursal_id ? `?sucursal_id=${filters.sucursal_id}` : ''}`),
      ])

      setArqueos(arqueoRes.data)
      setResumenHoy(resumenRes.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { arqueos, resumenHoy, loading, error, refetch: fetchAll }
}

export function useSucursales() {
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    api.get('/sucursales')
      .then((r) => setSucursales(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { sucursales, loading }
}
