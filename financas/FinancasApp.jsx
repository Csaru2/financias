import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://evzoyywlimskzznzchxt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_lRZZHoH9MnGuNLu0V6rV_A_h97v_22D'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
