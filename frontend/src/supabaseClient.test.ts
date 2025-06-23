import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient';

describe('Supabase Client', () => {

  it('should initialize the Supabase client without throwing an error', () => {
    // This test implicitly checks if the environment variables are loaded.
    // If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY were missing,
    // the client would have thrown an error on initialization.
    expect(supabase).toBeDefined();
    expect(supabase).not.toBeNull();
  });

  it('should be able to connect to the database and query a table', async () => {
    // This test checks connectivity to the Supabase project and that the 'ebooks' table exists.
    // We use .select() with a limit of 0 to check for table existence without fetching data.
    const { error } = await supabase.from('ebooks').select('id').limit(0);

    // The query should not return an error.
    // An error would indicate a problem with the URL, anon key, or that the table does not exist.
    expect(error).toBeNull();
  });

});
