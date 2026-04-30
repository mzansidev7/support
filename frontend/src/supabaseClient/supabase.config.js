import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://arbsbyvcqsxigqfvpxxw.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyYnNieXZjcXN4aWdxZnZweHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjIxNjYsImV4cCI6MjA4OTQ5ODE2Nn0.E9LAOG6pSCXoawl6tC2qXtow_TaA8rgCQSbQ2FWSWH8";

export const supabaseClient = createClient(supabaseUrl, supabaseKey);