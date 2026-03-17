// context/AuthContext.jsx — The Riser
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Axios instance with auth header
export const api = axios.create({ baseURL: API })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('riser_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('riser_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  // Hydrate user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('riser_token')
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => localStorage.removeItem('riser_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('riser_token', data.token)
    setUser(data.user)
    toast.success(`Welcome back, ${data.user.name}!`)
    return data.user
  }

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('riser_token', data.token)
    setUser(data.user)
    toast.success(`Account created! Welcome, ${data.user.name}`)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('riser_token')
    setUser(null)
    toast('Logged out', { icon: '👋' })
  }

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me')
    setUser(data.user)
    return data.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
