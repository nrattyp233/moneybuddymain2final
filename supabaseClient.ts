
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getInitialConfig = () => {
  const saved = localStorage.getItem('moneybuddy_config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      return {
        url: config.supabaseUrl || 'https://your-project-url.supabase.co',
        key: config.supabaseAnonKey || 'your-anon-key'
      };
    } catch (e) {
      console.error("Config parse error", e);
    }
  }
  return {
    url: 'https://your-project-url.supabase.co',
    key: 'your-anon-key'
  };
};

const config = getInitialConfig();
export let supabase = createClient(config.url, config.key);

export const reinitializeSupabase = (url: string, key: string) => {
  supabase = createClient(url, key);
  return supabase;
};
