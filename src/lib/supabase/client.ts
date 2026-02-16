import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/config/env'

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
    if (client) return client

    client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    return client
}
