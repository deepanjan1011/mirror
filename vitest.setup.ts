import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables for testing
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'mock-anon-key');
vi.stubEnv('COHERE_API_KEY', 'mock-cohere-key');
vi.stubEnv('VAPI_PUBLIC_KEY', 'mock-vapi-key');
