// generate-audio-from-text/index.test.ts

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.215.0/assert/mod.ts';
import { assertSpyCall, spy, stub } from 'https://deno.land/std@0.215.0/testing/mock.ts';
import * as mf from 'https://deno.land/x/mock_fetch@0.3.0/mod.ts';

// Mocks for environment variables
const ENV_VARS = {
  'SUPABASE_URL': 'https://example.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY': 'mock-service-role-key',
  'ELEVENLABS_API_KEY': 'mock-elevenlabs-api-key'
};

// Mock SupabaseClient
const mockSupabaseClient = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } } })
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { text_content: 'Test chapter text', ebook_id: 'mock-ebook-id' }, error: null })
      })
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null })
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: () => Promise.resolve({ error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` } })
    })
  }
};

// Setup and teardown for tests
Deno.test({
  name: 'generate-audio-from-text tests',
  sanitizeResources: false, // Disable resource sanitizer to prevent false positives
  sanitizeOps: false, // Disable operation sanitizer too
  async fn() {
    // Setup environment variable mocks
    // Instead of trying to stub Deno.env which is a property not a method,
    // we'll create a temporary global environment object
    const originalEnv = Deno.env;
    Object.defineProperty(Deno, 'env', {
      value: {
        get: (key: string) => ENV_VARS[key as keyof typeof ENV_VARS] || originalEnv.get(key)
      },
      configurable: true
    });

    // Mock fetch for ElevenLabs API calls
    mf.install();
    mf.mock('POST@/v1/text-to-speech/:voiceId', async (req: Request, params: Record<string, string>) => {
      const voiceId = params.voiceId;
      // Validate voice ID and API key
      const apiKey = req.headers.get('xi-api-key');
      if (apiKey !== ENV_VARS.ELEVENLABS_API_KEY) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Return mock audio blob
      return new Response(new Blob(['mock audio data'], { type: 'audio/mpeg' }), { 
        status: 200 
      });
    }, { baseUrl: 'https://api.elevenlabs.io' });

    try {
      // Import the module under test (this will now use our mocks)
      const moduleUrl = new URL('./index.ts', import.meta.url).href;
      const { default: handler } = await import(moduleUrl);

      await runTests(handler);
    } finally {
      // Clean up mocks
      // Restore original env
      Object.defineProperty(Deno, 'env', { value: originalEnv, configurable: true });
      mf.uninstall();
      
      // Explicitly clean up any lingering HTTP resources
      await new Promise(resolve => setTimeout(resolve, 100)); // Give time for any async operations to complete
    }
  }
});

async function runTests(handler: Function) {
  // Test group 1: Normal expected inputs
  await Deno.test('Handles normal request with chapter_id and voice_id', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chapter_id: 'mock-chapter-id', 
        voice_id: 'mock-voice-id'
      })
    });
    
    // Stub createClient to return our mock client
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => mockSupabaseClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 200);
      
      const body = await response.json();
      assertEquals(body.success, true);
      assertExists(body.audio_url);
    } finally {
      createClientMock.restore();
    }
  });

  await Deno.test('Uses default voice if voice_id is not provided', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'mock-chapter-id' })
    });
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => mockSupabaseClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 200);
      
      const body = await response.json();
      assertEquals(body.success, true);
    } finally {
      createClientMock.restore();
    }
  });

  // Test group 2: Edge cases
  await Deno.test('Handles OPTIONS request for CORS', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'OPTIONS'
    });
    
    const response = await handler(mockRequest);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
  });

  await Deno.test('Handles empty text content from chapter', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'empty-chapter-id' })
    });
    
    const emptyChapterClient = {
      ...mockSupabaseClient,
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: { text_content: '', ebook_id: 'mock-ebook-id' }, 
              error: null 
            })
          })
        }),
        update: mockSupabaseClient.from('').update
      })
    };
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => emptyChapterClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 200);
      
      const body = await response.json();
      assertEquals(body.success, true);
    } finally {
      createClientMock.restore();
    }
  });

  // Test group 3: Invalid inputs and error handling
  await Deno.test('Returns error for missing chapter_id', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: 'mock-voice-id' })
    });
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => mockSupabaseClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 500);
      
      const body = await response.json();
      assertEquals(body.error, 'Missing chapter_id in request body');
    } finally {
      createClientMock.restore();
    }
  });

  await Deno.test('Handles database error when fetching chapter', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'invalid-chapter-id' })
    });
    
    const dbErrorClient = {
      ...mockSupabaseClient,
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error' } 
            })
          })
        }),
        update: mockSupabaseClient.from('').update
      })
    };
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => dbErrorClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 500);
      
      const body = await response.json();
      assertStringIncludes(body.error, 'DB error fetching chapter');
    } finally {
      createClientMock.restore();
    }
  });

  await Deno.test('Handles ElevenLabs API error', async () => {
    // Override the ElevenLabs API mock for this test
    mf.mock('POST@/v1/text-to-speech/:voiceId', async (_req: Request, _params: Record<string, string>) => {
      return new Response(JSON.stringify({ detail: 'API error' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }, { baseUrl: 'https://api.elevenlabs.io' });
    
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'mock-chapter-id' })
    });
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => mockSupabaseClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 500);
      
      const body = await response.json();
      assertStringIncludes(body.error, 'ElevenLabs API failed');
    } finally {
      createClientMock.restore();
      
      // Restore the original mock
      mf.mock('POST@/v1/text-to-speech/:voiceId', async (_req: Request, _params: Record<string, string>) => {
        return new Response(new Blob(['mock audio data'], { type: 'audio/mpeg' }), { status: 200 });
      }, { baseUrl: 'https://api.elevenlabs.io' });
    }
  });

  await Deno.test('Handles storage upload error', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'mock-chapter-id' })
    });
    
    const storageErrorClient = {
      ...mockSupabaseClient,
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ error: { message: 'Storage error' } }),
          getPublicUrl: mockSupabaseClient.storage.from('').getPublicUrl
        })
      }
    };
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => storageErrorClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 500);
      
      const body = await response.json();
      assertStringIncludes(body.error, 'Storage upload error');
    } finally {
      createClientMock.restore();
    }
  });

  await Deno.test('Handles database update error', async () => {
    const mockRequest = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: 'mock-chapter-id' })
    });
    
    const updateErrorClient = {
      ...mockSupabaseClient,
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: { text_content: 'Test chapter text', ebook_id: 'mock-ebook-id' }, 
              error: null 
            })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: { message: 'Update error' } })
        })
      })
    };
    
    // Create a mock for createClient in the module's scope
    const createClientMock = stub(globalThis, 'createClient', () => updateErrorClient);
    
    try {
      const response = await handler(mockRequest);
      assertEquals(response.status, 500);
      
      const body = await response.json();
      assertStringIncludes(body.error, 'DB update error');
    } finally {
      createClientMock.restore();
    }
  });
}