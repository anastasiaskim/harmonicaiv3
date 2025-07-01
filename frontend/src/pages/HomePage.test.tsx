/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock, SpyInstance } from 'vitest';

import { Session } from '@supabase/supabase-js';
import HomePage from './HomePage';
import { supabase } from '../supabaseClient';
import * as api from '../services/api';

// Mocks
vi.mock('../services/api');
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));
// Create a hoisted mock for the sonner toast
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  promise: vi.fn(),
}));

// Mock the sonner module with the hoisted mock
vi.mock('sonner', () => ({
  toast: mockToast,
  Toaster: vi.fn(() => null),
}));
vi.mock('@supabase/auth-ui-react', () => ({
  Auth: vi.fn(() => <div>[Mocked Auth UI]</div>),
}));

// Define a type for the Ebook detail object for use in mocks
type EbookDetailForTest = NonNullable<api.AudiobookDetailsResponse['ebook']>;

// Mock Data
const mockSession: Session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: {
    id: 'user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '',
    app_metadata: {},
    user_metadata: {},
  },
  expires_in: 3600,
  expires_at: Date.now() + 3600,
  token_type: 'bearer',
};

const mockChapter: api.Chapter = {
  id: 'ch-1',
  ebook_id: 'ebook-123',
  chapter_number: 1,
  part_number: 1,
  title: 'Chapter 1',
  text_content: 'Some text',
  audio_url: null,
  audio_duration_seconds: null,
  status: 'pending',
  created_at: '',
};

const mockEbookDetail: EbookDetailForTest = {
  id: 'ebook-123',
  title: 'Test Book',
  author: 'Test Author',
  cover_image_url: null,
  status: 'pending',
};

const mockChapterDetail: api.ChapterDetail = {
  id: 'ch-1',
  chapter_number: 1,
  title: 'Chapter 1',
  text_content: 'Some text',
  audio_url: null,
  audio_duration_seconds: null,
  status: 'pending',
  created_at: '',
};

describe('HomePage', () => {
  // A simplified render helper
  const renderWithSession = (session: Session | null) => {
    (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session } });
    return render(<HomePage />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.onAuthStateChange as Mock).mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('should render login UI when no session exists', async () => {
    renderWithSession(null);
    await waitFor(() => {
      expect(screen.getByText('[Mocked Auth UI]')).toBeInTheDocument();
    });
  });

  it('should render main app when session exists', async () => {
    renderWithSession(mockSession);
    await waitFor(() => {
      expect(screen.getByText(/Welcome, test@example.com!/i)).toBeInTheDocument();
      expect(screen.getByText(/Harmonic AI/i)).toBeInTheDocument();
    });
  });

  it('should show error on upload failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithSession(mockSession);
    await screen.findByText(/Welcome, test@example.com!/i);

    vi.mocked(api.uploadEbookText).mockRejectedValue(new Error('Upload failed'));

    const textArea = screen.getByPlaceholderText(/Paste your text/);
    fireEvent.change(textArea, { target: { value: 'Some text' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Audiobook/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Upload failed');
    });
    consoleErrorSpy.mockRestore();
  });

  it('should sign out correctly', async () => {
    renderWithSession(mockSession);
    await screen.findByText(/Welcome, test@example.com!/i);

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('with polling', () => {
    const POLLING_INTERVAL = 5000; // Match component
    let setIntervalSpy: SpyInstance;
    let clearIntervalSpy: SpyInstance;

    beforeEach(() => {
      // We are using real timers, but we still want to spy on them
      setIntervalSpy = vi.spyOn(global, 'setInterval');
      clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle text submission, poll, and complete', async () => {
      renderWithSession(mockSession);
      await screen.findByText(/Welcome, test@example.com!/i);

      const mockEbookId = 'text-ebook-id';
      vi.mocked(api.uploadEbookText).mockResolvedValue({ ebook_id: mockEbookId, chapters: [{ ...mockChapter, id: 'ch-1', ebook_id: mockEbookId }] });
      vi.mocked(api.startAudioGeneration).mockResolvedValue({ message: 'Audio generation started' });

      // Mock the polling responses
      vi.mocked(api.getAudiobookDetails)
        .mockResolvedValueOnce({
          ebook: { ...mockEbookDetail, id: mockEbookId, status: 'processing' },
          chapters: [{ ...mockChapterDetail, status: 'pending_tts' }],
        })
        .mockResolvedValue({
          ebook: { ...mockEbookDetail, id: mockEbookId, status: 'complete' },
          chapters: [{ ...mockChapterDetail, status: 'complete', audio_url: 'http://test.com/audio.mp3' }],
        });

      const textArea = screen.getByPlaceholderText(/Paste your text/);
      fireEvent.change(textArea, { target: { value: 'Some new text' } });
      fireEvent.click(screen.getByRole('button', { name: /Generate Audiobook/i }));

      // Wait for polling to start
      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), POLLING_INTERVAL);
      });

      // Wait for the final state with a generous timeout
      await waitFor(
        () => {
          expect(screen.getByText('Audiobook generation complete!')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      expect(clearIntervalSpy).toHaveBeenCalled();
    }, 30000);

    it('should handle file upload, poll, and complete', async () => {
      renderWithSession(mockSession);
      await screen.findByText(/Welcome, test@example.com!/i);

      const mockEbookId = 'file-ebook-id';
      const mockFile = new File(['content'], 'test.epub', { type: 'application/epub+zip' });
      vi.mocked(api.uploadEbookFile).mockResolvedValue({ ebook_id: mockEbookId, chapters: [{ ...mockChapter, id: 'ch-file-1', ebook_id: mockEbookId }] });
      vi.mocked(api.startAudioGeneration).mockResolvedValue({ message: 'Audio generation started' });

      vi.mocked(api.getAudiobookDetails)
        .mockResolvedValueOnce({
          ebook: { ...mockEbookDetail, id: mockEbookId, status: 'processing' },
          chapters: [{ ...mockChapterDetail, status: 'pending_tts' }],
        })
        .mockResolvedValue({
          ebook: { ...mockEbookDetail, id: mockEbookId, status: 'complete' },
          chapters: [{ ...mockChapterDetail, status: 'complete', audio_url: 'http://test.com/audio.mp3' }],
        });

      const fileUploadButton = screen.getByRole('button', { name: /select a file/i });
      const fileInput = fileUploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      await waitFor(() => {
        expect(screen.getByText('Selected: test.epub')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Generate Audiobook/i }));

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), POLLING_INTERVAL);
      });

      await waitFor(
        () => {
          expect(screen.getByText('Audiobook generation complete!')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      expect(clearIntervalSpy).toHaveBeenCalled();
    }, 30000);
  });
});