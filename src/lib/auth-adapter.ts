import { createClient } from '@/lib/supabase/server'

// New adapter using Supabase Auth
export async function extractUserFromHeaders(request: Request) {
  // In the new flow, we don't really need headers if we use cookies 
  // via getUser(), but for API routes we might want to check

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { email: null, id: null }
  }

  return {
    email: user.email,
    id: user.id
  }
}

// Deprecated or compatibility functions can be removed or stubbed
export async function getUserFromToken(authTokens: any) {
  throw new Error('Deprecated: Use Supabase getUser() instead')
}

export async function getUserFromRequest(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
