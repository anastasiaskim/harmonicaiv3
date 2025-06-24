import { describe, it, expect, vi } from 'vitest';

// Mock the '@supabase/supabase-js' library to prevent actual network calls.
vi.mock('@supabase/supabase-js', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock-id' }], error: null }),
  };
  const from = vi.fn(() => mockQuery);
  const createClient = vi.fn(() => ({
    from,
  }));
  return { createClient };
});

// Import the supabase client *after* setting up the mock.
import { supabase } from './supabaseClient';

describe('Supabase Client', () => {
  it('should initialize the Supabase client without throwing an error', () => {
    expect(supabase).toBeDefined();
  });

  it('should be able to query a table without making a real network request', async () => {
    const { data, error } = await supabase.from('ebooks').select('id').limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'mock-id' }]);
  });

});
