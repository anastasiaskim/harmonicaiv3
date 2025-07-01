// supabase/functions/upload-ebook/index.test.ts

import {
  assert,
  assertEquals,
  assertExists,
} from 'std/testing/asserts.ts';
import sinon from 'sinon';
import { SupabaseClient } from '@supabase/supabase-js';
import { handleUpload } from './index.ts';

// Define types for our mocks to satisfy the TypeScript compiler
type MockSupabaseClient = Partial<SupabaseClient>;

// TODO: Revisit this type definition. Using 'any' for now to bypass a type resolution issue.
type SinonStub = any;

interface MockTable {
  insert: SinonStub;
  update: SinonStub;
  select: SinonStub;
  single: SinonStub;
  eq: SinonStub;
}

// Main test suite for the upload-ebook function
Deno.test('upload-ebook handler', async (t) => {
  let mockSupabaseClient: MockSupabaseClient;
  let mockParseEpub: SinonStub;
  let fromStub: SinonStub;
  let ebooksTable: MockTable;
  let chaptersTable: MockTable;

  // A setup function to reset mocks before each test step
  const setup = () => {
    mockParseEpub = sinon.stub();

    // Define the mock table structure
    ebooksTable = {
      insert: sinon.stub().returnsThis(),
      update: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      single: sinon.stub().resolves({ data: { id: 'ebook-123' }, error: null }),
      eq: sinon.stub().returnsThis(),
    };
    ebooksTable.update.resolves({ error: null });

    chaptersTable = {
      insert: sinon.stub().returnsThis(),
      select: sinon.stub().resolves({ data: [{ id: 'chapter-456' }], error: null }),
      // Add stubs for methods not used but needed for type compatibility if any
      update: sinon.stub(),
      single: sinon.stub(),
      eq: sinon.stub(),
    };

    fromStub = sinon.stub();
    fromStub.withArgs('ebooks').returns(ebooksTable);
    fromStub.withArgs('chapters').returns(chaptersTable);

    mockSupabaseClient = {
      from: fromStub,
      auth: {
        getUser: sinon.stub().resolves({ data: { user: { id: 'user-123' } }, error: null }),
      } as any,
    };
  };

  await t.step('should process a valid EPUB file successfully', async () => {
    setup();
    const file = new File(['epub-content'], 'test.epub', { type: 'application/epub+zip' });
    const formData = new FormData();
    formData.append('file', file);
    const request = new Request('http://localhost/upload', { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer FAKE-TOKEN' } });

    mockParseEpub.resolves({ sections: [{ html: '<p>Chapter 1</p>', title: 'Title 1' }] });

    const response = await handleUpload(request, {
      supabaseClient: mockSupabaseClient as SupabaseClient,
      parseEpub: mockParseEpub,
    });
    const resBody = await response.json();

    assertEquals(response.status, 200);
    assertEquals(resBody.message, 'Ebook uploaded and processed successfully');
    assertExists(resBody.ebook);
    assertEquals(ebooksTable.insert.calledOnce, true);
    assertEquals(chaptersTable.insert.calledOnce, true);
    assertEquals(ebooksTable.update.calledOnce, true);
  });

  await t.step('should fail if no file is provided', async () => {
    setup();
    const request = new Request('http://localhost/upload', { method: 'POST', body: new FormData(), headers: { 'Authorization': 'Bearer FAKE-TOKEN' } });

    const response = await handleUpload(request, {
      supabaseClient: mockSupabaseClient as SupabaseClient,
      parseEpub: mockParseEpub,
    });
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.error, 'File not found in form data. Make sure the key is "file".');
  });

  await t.step('should fail gracefully if EPUB parsing fails', async () => {
    setup();
    const file = new File(['invalid'], 'bad.epub', { type: 'application/epub+zip' });
    const formData = new FormData();
    formData.append('file', file);
    const request = new Request('http://localhost/upload', { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer FAKE-TOKEN' } });

    mockParseEpub.rejects(new Error('EPUB parse error'));

    const response = await handleUpload(request, {
      supabaseClient: mockSupabaseClient as SupabaseClient,
      parseEpub: mockParseEpub,
    });
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'EPUB parse error');
    assert(
      ebooksTable.update.calledWith(sinon.match({
        status: 'failed',
        status_message: 'EPUB parse error',
      }))
    );
  });

  await t.step('should fail if ebook has no text content after parsing', async () => {
    setup();
    const file = new File(['empty'], 'empty.epub', { type: 'application/epub+zip' });
    const formData = new FormData();
    formData.append('file', file);
    const request = new Request('http://localhost/upload', { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer FAKE-TOKEN' } });

    mockParseEpub.resolves({ sections: [{ html: ' ' }, { html: '<p></p>' }] });

    const response = await handleUpload(request, {
      supabaseClient: mockSupabaseClient as SupabaseClient,
      parseEpub: mockParseEpub,
    });
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Ebook has no text content after parsing.');
    assert(
      ebooksTable.update.calledWith(sinon.match({
        status: 'failed',
        status_message: 'Ebook has no text content after parsing.',
      }))
    );
  });

  await t.step('should fail if database insertion for ebook fails', async () => {
    setup();
    ebooksTable.single.resolves({ data: null, error: new Error('DB insert failed') });
    const file = new File(['content'], 'test.epub', { type: 'application/epub+zip' });
    const formData = new FormData();
    formData.append('file', file);
    const request = new Request('http://localhost/upload', { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer FAKE-TOKEN' } });

    const response = await handleUpload(request, {
      supabaseClient: mockSupabaseClient as SupabaseClient,
      parseEpub: mockParseEpub,
    });
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'DB insert failed');
  });
});
