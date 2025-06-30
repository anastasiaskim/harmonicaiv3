/// <reference types="vitest/globals" />

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HomePage from './HomePage';
import * as api from '../services/api';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

// Mock API services
vi.mock('../services/api');

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: vi.fn(() => null), // Mock Toaster component to prevent render errors
}));

// Mock Auth UI component
vi.mock('@supabase/auth-ui-react', () => ({
  Auth: vi.fn(() => <div>[Mocked Auth UI]</div>),
}));

const mockSession = {
  access_token: 'test-token',
  user: { id: 'test-user-id', email: 'test@example.com' },
} as unknown as Session;

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementation((_event: string, _session: Session | null) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('should render the login UI when no session exists initially', async () => {
    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementation((callback: (event: string, session: Session | null) => void) => {
      callback('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(<HomePage />);
    expect(await screen.findByText('[Mocked Auth UI]')).toBeInTheDocument();
  });

  it('should render the main app when a session exists', async () => {
    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: mockSession } });
    render(<HomePage />);
    expect(await screen.findByText(/Transform your text or e-books/i)).toBeInTheDocument();
    expect(screen.queryByText('[Mocked Auth UI]')).not.toBeInTheDocument();
  });

  it('should handle text submission, generate audio, and poll for results', async () => {
    const mockUploadResponse: api.UploadEbookResponse = {
      message: 'Content uploaded successfully!',
      ebook: { id: 'ebook-123', status: 'processing', created_at: '', original_file_name: null, original_file_type: null, extracted_text_preview: null, user_id: 'user-123', title: 'test', author: 'test', cover_image_url: null },
      chapter: { id: 'chapter-123', ebook_id: 'ebook-123', chapter_number: 1, title: 'intro', text_content: 'once upon a time', audio_url: null, audio_duration_seconds: null, status: 'pending', created_at: '' },
    };
    const mockAudioDetailsProcessing: api.AudiobookDetailsResponse = {
      ebook: { id: 'ebook-123', status: 'processing', title: 'test', author: 'test', cover_image_url: null },
      chapters: [{ id: 'ch-1', status: 'pending_tts', chapter_number: 1, title: 'intro', text_content: 'once upon a time', audio_url: null, audio_duration_seconds: null, created_at: '' }],
    };
    const mockAudioDetailsCompleted: api.AudiobookDetailsResponse = {
      ebook: { id: 'ebook-123', status: 'complete', title: 'test', author: 'test', cover_image_url: null },
      chapters: [{ id: 'ch-1', audio_url: 'http://example.com/audio.mp3', chapter_number: 1, title: 'intro', text_content: 'once upon a time', audio_duration_seconds: 120, status: 'complete', created_at: '' }],
    };

    vi.mocked(api.uploadEbookText).mockResolvedValue(mockUploadResponse);
    vi.mocked(api.generateAudioBatch).mockResolvedValue({ message: 'success', successful_count: 1, failed_count: 0, results: [] });
    vi.mocked(api.getAudiobookDetails)
      .mockResolvedValueOnce(mockAudioDetailsProcessing)
      .mockResolvedValue(mockAudioDetailsCompleted);

    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: mockSession } });
    render(<HomePage />);

    const textarea = await screen.findByPlaceholderText('Paste your text here to convert it into an audiobook...');
    fireEvent.change(textarea, { target: { value: 'This is a test.' } });
    fireEvent.click(screen.getByText('Generate Audiobook'));

    await waitFor(() => {
      expect(api.uploadEbookText).toHaveBeenCalledWith('This is a test.');
    });
    await waitFor(() => {
      expect(api.generateAudioBatch).toHaveBeenCalledWith('ebook-123', '21m00Tcm4TlvDq8ikWAM');
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Audiobook ready!');
    }, { timeout: 12000 });
  }, 15000);

  it('should handle file upload and processing', async () => {
    const mockFile = new File(['file content'], 'test.epub', { type: 'application/epub+zip' });
    const mockUploadResponse: api.UploadEbookResponse = {
      message: 'Content uploaded successfully!',
      ebook: { id: 'ebook-456', status: 'processing', created_at: '', original_file_name: 'test.epub', original_file_type: 'application/epub+zip', extracted_text_preview: null, user_id: 'user-123', title: 'test', author: 'test', cover_image_url: null },
      chapter: { id: 'chapter-456', ebook_id: 'ebook-456', chapter_number: 1, title: 'intro', text_content: 'once upon a time', audio_url: null, audio_duration_seconds: null, status: 'pending', created_at: '' },
    };

    vi.mocked(api.uploadEbookFile).mockResolvedValue(mockUploadResponse);
    vi.mocked(api.generateAudioBatch).mockResolvedValue({ message: 'success', successful_count: 1, failed_count: 0, results: [] });
    const mockAudioDetailsProcessing: api.AudiobookDetailsResponse = {
      ebook: { id: 'ebook-456', status: 'processing', title: 'test', author: 'test', cover_image_url: null },
      chapters: [{ id: 'ch-1', status: 'pending', chapter_number: 1, title: 'intro', text_content: 'file content', audio_url: null, audio_duration_seconds: null, created_at: '' }],
    };
    vi.mocked(api.getAudiobookDetails).mockResolvedValue(mockAudioDetailsProcessing);
    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: mockSession } });
    const { container } = render(<HomePage />);

    // Wait for the component to be in the authenticated state
    await screen.findByText('Generate Audiobook');

    const fileInput = container.querySelector('#file-upload-input');
    expect(fileInput).not.toBeNull();
    
    fireEvent.change(fileInput!, { target: { files: [mockFile] } });
    
    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('File selected: test.epub');
    });

    fireEvent.click(screen.getByText('Generate Audiobook'));

    await waitFor(() => {
      expect(api.uploadEbookFile).toHaveBeenCalledWith(mockFile, 'test-token');
    });
    await waitFor(() => {
      expect(api.generateAudioBatch).toHaveBeenCalledWith('ebook-456', '21m00Tcm4TlvDq8ikWAM');
    });
    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Content uploaded successfully!');
    });
  });

  it('should show an error toast on upload failure', async () => {
    vi.mocked(api.uploadEbookText).mockRejectedValue(new Error('Upload failed miserably'));

    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: mockSession } });
    render(<HomePage />);

    const textarea = await screen.findByPlaceholderText('Paste your text here to convert it into an audiobook...');
    fireEvent.change(textarea, { target: { value: 'This will fail.' } });
    fireEvent.click(screen.getByText('Generate Audiobook'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed miserably');
    });
  });

  it('should call signOut and update session on sign out button click', async () => {
    (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: mockSession } });
    (supabase.auth.signOut as vi.Mock).mockResolvedValue({ error: null });

    let authCallback: (event: string, session: Session | null) => void = () => {};
    (supabase.auth.onAuthStateChange as vi.Mock).mockImplementation((callback: (event: string, session: Session | null) => void) => {
      authCallback = callback;
      callback('SIGNED_IN', mockSession);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(<HomePage />);
    const signOutButton = await screen.findByText('Sign Out');

    (supabase.auth.signOut as vi.Mock).mockImplementation(async () => {
      authCallback('SIGNED_OUT', null);
      return { error: null };
    });

    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('[Mocked Auth UI]')).toBeInTheDocument();
    });
  });
});