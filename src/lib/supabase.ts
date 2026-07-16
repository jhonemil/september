import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eodccponqwzqnozbnlra.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZGNjcG9ucXd6cW5vemJubHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjE4NDUsImV4cCI6MjA5MDI5Nzg0NX0.j8IWTRFIt1DBF6t7loa-xqI2cx4nGpH0YZ0V0DiyltM';

export const supabaseClient = createClient(supabaseUrl, supabaseKey);

export interface ActivityLog {
  event_name: string;
  page_url: string;
}

export async function logActivity(eventName: string, pageUrl: string): Promise<void> {
  try {
    await supabaseClient.from('activity_logs').insert([
      { event_name: eventName, page_url: pageUrl }
    ]);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export async function getActiveLayout(): Promise<number> {
  try {
    const { data, error } = await supabaseClient
      .from('app_settings')
      .select('selected_layout')
      .limit(1)
      .single();
    if (error || !data) {
      console.warn("Could not fetch app_settings, defaulting to Layout 1. Error:", error);
      return 1;
    }
    return data.selected_layout;
  } catch (e) {
    console.warn("Fallback to Layout 1. app_settings table might not exist yet:", e);
    return 1;
  }
}

export function subscribeToLayoutChange(onUpdate: (newLayoutId: number) => void) {
  try {
    const channel = supabaseClient
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings' },
        (payload) => {
          if (payload.new && typeof payload.new.selected_layout !== 'undefined') {
            onUpdate(payload.new.selected_layout);
          }
        }
      )
      .subscribe();
    return channel;
  } catch (e) {
    console.error("Realtime subscription failed:", e);
    return null;
  }
}
