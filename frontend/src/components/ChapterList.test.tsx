import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import ChapterList, { Chapter } from './ChapterList';

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const original = await vi.importActual('lucide-react');
  return {
    ...original,
    Play: () => <svg data-testid="play-icon" />,
    Pause: () => <svg data-testid="pause-icon" />,
    Download: () => <svg data-testid="download-icon" />,
    Loader2: () => <svg data-testid="loader-icon" />,
    CircleCheck: () => <svg data-testid="check-icon" />,
    CircleAlert: () => <svg data-testid="alert-icon" />,
    Hourglass: () => <svg data-testid="hourglass-icon" />,
  };
});

const mockChapters: Chapter[] = [
  {
    id: 'ch1',
    chapter_number: 1,
    title: 'The Beginning',
    audio_url: 'http://localhost/audio/ch1.mp3',
    status: 'complete',
  },
  {
    id: 'ch2',
    chapter_number: 2,
    title: 'The Middle',
    audio_url: null,
    status: 'processing_tts',
  },
  {
    id: 'ch3',
    chapter_number: 3,
    title: 'The End',
    audio_url: null,
    status: 'pending_tts',
  },
  {
    id: 'ch4',
    chapter_number: 4,
    title: 'The Epilogue',
    audio_url: null,
    status: 'error_tts',
  },
];

const mockOnPlayChapter = vi.fn();
const mockOnDownloadChapter = vi.fn();

describe('ChapterList with Shadcn UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders a list of chapters with correct titles and badge statuses', () => {
    render(
      <ChapterList
        chapters={mockChapters}
        onPlayChapter={mockOnPlayChapter}
        onDownloadChapter={mockOnDownloadChapter}
        currentPlayingChapterId={null}
      />
    );

    // Check for each chapter's title and status badge
    const chapter1 = screen.getByRole('listitem', { name: /1. The Beginning/i });
    expect(within(chapter1).getByText('Complete')).toBeInTheDocument();
    expect(within(chapter1).getByTestId('check-icon')).toBeInTheDocument();

    const chapter2 = screen.getByRole('listitem', { name: /2. The Middle/i });
    expect(within(chapter2).getByText('Processing')).toBeInTheDocument();
    expect(within(chapter2).getByTestId('loader-icon')).toBeInTheDocument();

    const chapter3 = screen.getByRole('listitem', { name: /3. The End/i });
    expect(within(chapter3).getByText('Pending')).toBeInTheDocument();
    expect(within(chapter3).getByTestId('hourglass-icon')).toBeInTheDocument();

    const chapter4 = screen.getByRole('listitem', { name: /4. The Epilogue/i });
    expect(within(chapter4).getByText('Error')).toBeInTheDocument();
    expect(within(chapter4).getByTestId('alert-icon')).toBeInTheDocument();
  });

  test('renders null when no chapters are provided', () => {
    const { container } = render(
      <ChapterList
        chapters={[]}
        onPlayChapter={mockOnPlayChapter}
        onDownloadChapter={mockOnDownloadChapter}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('calls onPlayChapter when play button is clicked for a completed chapter', () => {
    render(<ChapterList chapters={mockChapters} onPlayChapter={mockOnPlayChapter} onDownloadChapter={mockOnDownloadChapter} />);
    
    const chapter1 = screen.getByRole('listitem', { name: /1. The Beginning/i });
    const playButton = within(chapter1).getByRole('button', { name: /play chapter 1/i });
    
    expect(playButton).toBeEnabled();
    fireEvent.click(playButton);
    expect(mockOnPlayChapter).toHaveBeenCalledWith('ch1');
  });

  test('shows a stop button for the currently playing chapter', () => {
    render(<ChapterList chapters={mockChapters} onPlayChapter={mockOnPlayChapter} onDownloadChapter={mockOnDownloadChapter} currentPlayingChapterId="ch1" />);
    
    const chapter1 = screen.getByRole('listitem', { name: /1. The Beginning/i });
    const stopButton = within(chapter1).getByRole('button', { name: /stop chapter 1/i });
    
    expect(stopButton).toBeInTheDocument();
    expect(within(stopButton).getByText('Stop')).toBeInTheDocument();
    expect(within(stopButton).getByTestId('pause-icon')).toBeInTheDocument();
  });

  test('calls onDownloadChapter when download button is clicked', () => {
    render(<ChapterList chapters={mockChapters} onPlayChapter={mockOnPlayChapter} onDownloadChapter={mockOnDownloadChapter} />);
    
    const chapter1 = screen.getByRole('listitem', { name: /1. The Beginning/i });
    const downloadButton = within(chapter1).getByRole('button', { name: /download chapter 1/i });
    
    expect(downloadButton).toBeEnabled();
    fireEvent.click(downloadButton);
    expect(mockOnDownloadChapter).toHaveBeenCalledWith('ch1');
  });

  test('disables play button for chapters that are not complete', () => {
    render(<ChapterList chapters={mockChapters} onPlayChapter={mockOnPlayChapter} onDownloadChapter={mockOnDownloadChapter} />);
    
    const chapter2 = screen.getByRole('listitem', { name: /2. The Middle/i }); // Status: 'processing_tts'
    const playButton = within(chapter2).getByRole('button', { name: /play/i });
    
    expect(playButton).toBeDisabled();
  });
});
