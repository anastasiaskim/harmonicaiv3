import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This script creates a temporary test user in the local Supabase instance
// and outputs their JWT for testing authenticated endpoints.

async function createTestUser() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.');
    Deno.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const email = `test-user-${Date.now()}@example.com`;
  const password = 'password123';

  console.log(`Attempting to sign up test user: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    console.error('Error signing up test user:', error.message);
    Deno.exit(1);
  }

  // In local dev, auto-confirmation is usually on. If a session is returned, we have the JWT.
  if (data.session) {
    console.log('Test user created successfully!');
    console.log('---BEGIN JWT---');
    console.log(data.session.access_token);
    console.log('---END JWT---');
  } else {
    console.error('Sign-up succeeded, but no session was returned. Please check if email auto-confirmation is enabled in your local Supabase config.');
    Deno.exit(1);
  }
}

createTestUser();
