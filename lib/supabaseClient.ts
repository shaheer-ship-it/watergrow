import { createClient } from '@supabase/supabase-js';

// Credentials provided in the prompt
const SUPABASE_URL = 'https://nirgbqilyzdjedorvdur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcmdicWlseXpkamVkb3J2ZHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ3NDcsImV4cCI6MjA4MTE0MDc0N30.9UvEY8lGdmlP4Q9xhK9RTbUQJ7vwg4ySepStBZPXK24';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
