import { NextRequest } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

export function checkAuth(req: NextRequest) {
  if (!ADMIN_PASSWORD) return false
  const cookie = req.cookies.get('accolta_admin')?.value
  return cookie === ADMIN_PASSWORD
}
