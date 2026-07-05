// Hook pour appeler l'API admin sécurisée depuis le client
// Le token admin est stocké en mémoire (sessionStorage) uniquement

export function useAdminApi() {
  const getToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('accolta_admin_token') || '' : ''

  const headers = () => ({
    'Content-Type': 'application/json',
    'x-admin-token': getToken(),
  })

  const upsert = async (song: {
    artiste: string
    album?: string
    titre: string
    annee?: number | null
    paroles?: string | null
  }) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'upsert', ...song }),
    })
    return res.json()
  }

  const update = async (id: number, fields: Record<string, unknown>) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'update', id, ...fields }),
    })
    return res.json()
  }

  const remove = async (id: number) => {
    const res = await fetch(`/api/admin?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    })
    return res.json()
  }

  const importRows = async (rows: unknown[]) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'import', rows }),
    })
    return res.json()
  }

  const stats = async () => {
    const res = await fetch('/api/admin?action=stats', { headers: headers() })
    return res.json()
  }

  return { upsert, update, remove, importRows, stats }
}
