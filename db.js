const supabaseUrl = 'https://eodccponqwzqnozbnlra.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZGNjcG9ucXd6cW5vemJubHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjE4NDUsImV4cCI6MjA5MDI5Nzg0NX0.j8IWTRFIt1DBF6t7loa-xqI2cx4nGpH0YZ0V0DiyltM';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function logActivity(eventName, pageUrl) {
    try {
        await supabaseClient.from('activity_logs').insert([
            { event_name: eventName, page_url: pageUrl }
        ]);
    } catch (err) {
        console.error("Failed to log activity:", err);
    }
}
