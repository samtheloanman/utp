'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './client';

/**
 * Returns a cookie-backed browser Supabase client when NEXT_PUBLIC_SUPABASE_URL
 * and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured, or `null` in offline / unit
 * test environments so UI shells like `TopBar` never throw during render.
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url !== undefined || key !== undefined) {
    if (
      !url ||
      !key ||
      url.includes('your-project.supabase.co') ||
      key === 'your-anon-key'
    ) {
      return null;
    }
  }
  try {
    return createClient() ?? null;
  } catch {
    return null;
  }
}
