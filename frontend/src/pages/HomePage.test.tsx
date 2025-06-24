import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import HomePage from './HomePage';
import * as apiService from '../services/api';
import { supabase } from '../supabaseClient';

// Mock the API service
vi.mock('../services/api', () => ({
  uploadEbookText: vi.fn(),
  uploadEbookFile: vi.fn(),
  generateAudioBatch: vi.fn(),
  getAudiobookDetails: vi.fn(),
}));

// Mock Supabase client
let capturedPostgresChangesCallback: ((payload: any) => void) | null = null; // Variable to capture the callback

const mockChannel = {
  on: vi.fn((event: string, _filter: any, handlerCallback: (payload: any) => void) => {
    if (event === 'postgres_changes') {
      capturedPostgresChangesCallback = handlerCallback; // Capture the third argument
    }
    return mockChannel; // Return this for chaining
  }),
  subscribe: vi.fn(callback => {
    if (typeof callback === 'function') {
      setTimeout(() => callback('SUBSCRIBED'), 0); // Simulate async subscription
    }
    return mockChannel;
  }),
  unsubscribe: vi.fn().mockResolvedValue('unsubscribed'),
};
vi.mock('../supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
}));

const mockEbook = { id: 'ebook-123', title: 'Test Ebook', status: 'pending', file_name: 'test.txt', original_file_type: 'txt', user_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
const mockChapters = [
  { id: 'ch-1', ebook_id: 'ebook-123', chapter_number: 1, title: 'Chapter 1', text_content: 'Text 1', status: 'pending', audio_url: null, error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ch-2', ebook_id: 'ebook-123', chapter_number: 2, title: 'Chapter 2', text_content: 'Text 2', status: 'pending', audio_url: null, error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Define the placeholder text to match the DOM output (with \\n)
const TEXTAREA_PLACEHOLDER = "Paste your content here (e.g., a book chapter, an article). Chapters will be automatically detected based on common patterns or you can denote them with '---CHAPTER BREAK---' on a new line.";

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.uploadEbookText as vi.Mock).mockResolvedValue({ ebook: mockEbook, chapters: [mockChapters[0]] });
    (apiService.uploadEbookFile as vi.Mock).mockResolvedValue({ ebook: mockEbook, chapters: [mockChapters[0]] });
    (apiService.getAudiobookDetails as vi.Mock).mockResolvedValue({ ebook: mockEbook, chapters: mockChapters });
    (apiService.generateAudioBatch as vi.Mock).mockResolvedValue({
      message: 'Batch processing finished.',
      successful_count: 2,
      failed_count: 0,
      results: mockChapters.map(ch => ({ chapter_id: ch.id, status: 'success', audio_url: `http://localhost/audio/${ch.id}.mp3`, error: null }))
    });
    mockChannel.on.mockClear();
    mockChannel.subscribe.mockClear();
    mockChannel.unsubscribe.mockClear();
    capturedPostgresChangesCallback = null; // Reset captured callback
  });

  test('renders initial state correctly', () => {
    render(<HomePage />);
    expect(screen.getByText('Harmonic AI')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(TEXTAREA_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByText('Generate Audiobook')).toBeInTheDocument();
  });

  test('handles text input and submission', async () => {
    render(<HomePage />);
    const textArea = screen.getByPlaceholderText(TEXTAREA_PLACEHOLDER);
    fireEvent.change(textArea, { target: { value: 'Test input text' } });
    expect(textArea).toHaveValue('Test input text');

    const generateButton = screen.getByText('Generate Audiobook');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiService.uploadEbookText).toHaveBeenCalledWith('Test input text');
    });
    await waitFor(() => {
      expect(apiService.getAudiobookDetails).toHaveBeenCalledWith(mockEbook.id);
    });
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(`chapters:ebook_id=eq.${mockEbook.id}`);
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiService.generateAudioBatch).toHaveBeenCalledWith(mockEbook.id, expect.any(String));
    });
    await waitFor(() => {
      expect(screen.getByText('1. Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('2. Chapter 2')).toBeInTheDocument();
    });
  });

  test('handles file input and submission', async () => {
    const { container } = render(<HomePage />); // Render and get container for querySelector
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });

    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;
    expect(fileInput).not.toBeNull(); 

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true
    });
    fireEvent.change(fileInput);

    expect(await screen.findByText(/Selected file:/)).toBeInTheDocument();
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText(/0 KB/)).toBeInTheDocument();

    const generateButton = screen.getByText('Generate Audiobook');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiService.uploadEbookFile).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(apiService.getAudiobookDetails).toHaveBeenCalledWith(mockEbook.id);
    });
    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith(`chapters:ebook_id=eq.${mockEbook.id}`);
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiService.generateAudioBatch).toHaveBeenCalledWith(mockEbook.id, expect.any(String));
    });
    await waitFor(() => {
      expect(screen.getByText('1. Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('2. Chapter 2')).toBeInTheDocument(); // Both chapters should be present after getAudiobookDetails
    });
  });

  test('displays error message if submission fails', async () => {
    (apiService.uploadEbookText as vi.Mock).mockRejectedValue(new Error('Upload failed miserably'));
    render(<HomePage />);
    const textArea = screen.getByPlaceholderText(TEXTAREA_PLACEHOLDER);
    fireEvent.change(textArea, { target: { value: 'Test input text' } });
    const generateButton = screen.getByText('Generate Audiobook');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed miserably')).toBeInTheDocument();
    });
  });

  test('updates chapter status on Realtime event', async () => {
    render(<HomePage />);
    const textArea = screen.getByPlaceholderText(TEXTAREA_PLACEHOLDER);
    fireEvent.change(textArea, { target: { value: 'Test input text' } });
    fireEvent.click(screen.getByText('Generate Audiobook'));

    await waitFor(() => {
      expect(screen.getByText('1. Chapter 1')).toBeInTheDocument();
    });

    if (!capturedPostgresChangesCallback) {
      throw new Error("Realtime 'postgres_changes' callback not captured");
    }

    const updatedChapterPayload = {
      eventType: 'UPDATE',
      new: { ...mockChapters[0], status: 'complete', audio_url: 'http://localhost/audio/ch-1.mp3' },
      old: mockChapters[0],
      schema: 'public',
      table: 'chapters',
      commit_timestamp: new Date().toISOString(),
    };

    await act(async () => {
      if (capturedPostgresChangesCallback) capturedPostgresChangesCallback(updatedChapterPayload);
    });

    await waitFor(() => {
      const chapter1TitleElement = screen.getByText('1. Chapter 1');
      const chapter1ListItem = chapter1TitleElement.parentElement?.parentElement;
      expect(chapter1ListItem).not.toBeNull();
      expect(chapter1ListItem).toBeInTheDocument(); // Ensure the container itself is found
            expect(within(chapter1ListItem!).getByText('Complete')).toBeInTheDocument();
      expect(within(chapter1ListItem!).getByRole('button', { name: /play/i })).toBeEnabled();
    });
  });
});