import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const authClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function registerUser(payload) {
  const { data } = await authClient.post('/register', payload)
  return data
}

export async function loginUser(payload) {
  const { data } = await authClient.post('/login', payload)
  return data
}

export default authClient
