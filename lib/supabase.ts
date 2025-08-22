import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Client-side Supabase client
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Server-side Supabase client (for App Router)
export function createServerSupabaseClient() {
  // Only import next/headers when in a Server Component context
  if (typeof window === 'undefined') {
    try {
      const { cookies } = require('next/headers')
      const cookieStore = cookies()
      
      return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      })
    } catch (error) {
      // Fallback for when next/headers is not available
      return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    }
  }
  
  // Fallback for client-side
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Database types
export interface DatabaseUser {
  id: string
  email: string
  name: string
  role: "patient" | "doctor"
  public_key?: string
  encrypted_private_key?: string
  created_at: string
  updated_at: string
}

export interface DatabasePatientRecord {
  id: string
  patient_id: string
  file_name: string
  file_type: string
  encrypted_data: string
  iv: string
  encrypted_key: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DatabaseShareRequest {
  id: string
  record_id: string
  patient_id: string
  doctor_id: string
  doctor_email: string
  doctor_name: string
  expires_at: string
  access_level: "view" | "download"
  status: "pending" | "approved" | "denied"
  created_at: string
  updated_at: string
}

export interface DatabaseAuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  encrypted_details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}
