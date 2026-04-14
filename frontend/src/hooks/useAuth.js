import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export function useAuth() {
  const { token, user, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password })
    const { access_token } = response.data

    // Obtener datos del usuario
    const meResponse = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    setAuth(access_token, meResponse.data)
    return meResponse.data
  }

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return { token, user, login, logout, isAuthenticated: !!token }
}
