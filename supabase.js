import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://aftksymubblyormajxiq.supabase.co";

const SUPABASE_KEY = "sb_publishable_4taWqjzl8zNutqKeAjJZUQ_r7l4sc_P";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

