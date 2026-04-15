import axios from 'axios'

// En producción (Railway) no hay VITE_API_URL → URL relativa (mismo origen)
// En desarrollo local → http://localhost:8001
const API_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: API_URL,
  timeout: 90000,
})

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('elrey-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch (_) {}
  return config
})

// Manejar 401 globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('elrey-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
