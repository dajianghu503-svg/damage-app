import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 階数ソート用の順序定義（高→低）
export const FLOOR_ORDER = [
  'RF',
  ...Array.from({ length: 39 }, (_, i) => `${39 - i}F`),
  'B1F',
]

export const FLOOR_OPTIONS = FLOOR_ORDER

export function floorSortIndex(floor) {
  const idx = FLOOR_ORDER.indexOf(floor)
  return idx === -1 ? 999 : idx
}
