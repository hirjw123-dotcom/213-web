const API_BASE = 'http://localhost:2131/api'

export const fileAPI = {
  async create(filename, content) {
    const response = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        filename,
        content: typeof content === 'string' ? content : JSON.stringify(content)
      })
    })
    return response.json()
  },

  async read(filename) {
    const response = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'read',
        filename
      })
    })
    const data = await response.json()
    if (data.success && data.content) {
      try {
        data.content = JSON.parse(data.content)
      } catch {}
    }
    return data
  },

  async update(filename, content) {
    const response = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        filename,
        content: typeof content === 'string' ? content : JSON.stringify(content)
      })
    })
    return response.json()
  },

  async delete(filename) {
    const response = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        filename
      })
    })
    return response.json()
  },

  async list() {
    const response = await fetch(`${API_BASE}/files`)
    return response.json()
  }
}
