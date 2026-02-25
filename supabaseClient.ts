import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqzqhuquluyvpjyieydl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenFodXF1bHV5dnBqeWlleWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzYxOTksImV4cCI6MjA4NzU1MjE5OX0.twywydwAIL3aME9pk-9cO5Xsbophi3ruNwFZYjfEvYU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
