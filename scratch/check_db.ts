import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttendanceLog() {
  const { data, error } = await supabase
    .from('attendance_log')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching attendance_log:', error);
    return;
  }

  console.log('Sample data from attendance_log:', JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  }
}

checkAttendanceLog();
