import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const DEFAULT_SUPABASE_URL = 'https://qfreeubflnyqrwtnhzcm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable__qMK0CSgZL12sldy20MS7A_pqdTnQYs';

function isValidHttpUrl(stringToTest) {
  if (!stringToTest || typeof stringToTest !== 'string') return false;
  const trimmed = stringToTest.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveSupabaseConfig() {
  const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let url = DEFAULT_SUPABASE_URL;
  if (isValidHttpUrl(envUrl)) {
    url = envUrl.trim();
  }

  let key = DEFAULT_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    key = envKey.trim();
  }

  return { url, key };
}

const { url: initialUrl, key: initialKey } = resolveSupabaseConfig();
export const supabase = createClient(initialUrl, initialKey);
export default supabase;
