import React, { useState, useEffect } from 'react';
import TextInputArea from '../components/TextInputArea';
import VoiceSelection from '../components/VoiceSelection';
import FileUpload from '../components/FileUpload';
import ChapterList, { Chapter } from '../components/ChapterList';
import {
  uploadEbookText,
  uploadEbookFile,
  UploadEbookResponse,
  generateAudioBatch,
  getAudiobookDetails,
} from '../services/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';

const POLLING_INTERVAL = 5000; // 5 seconds

const HomePage: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM'); // Default to Rachel
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadResponse, setUploadResponse] = useState<UploadEbookResponse | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentEbookId, setCurrentEbookId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('Ready to generate your audiobook.');

  const resetState = () => {
    setText('');
    setSelectedFile(null);
    setIsLoading(false);
    setUploadResponse(null);
    setChapters([]);
    setCurrentEbookId(null);
    if (currentAudio) {
      currentAudio.pause();
    }
    setCurrentAudio(null);
    setPlayingChapterId(null);
    setIsPolling(false);
    setCurrentProgress(0);
    setProgressMessage('Ready to generate your audiobook.');
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (newText.trim() && selectedFile) {
      setSelectedFile(null);
      toast.info('File selection cleared as text was entered.');
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setText('');
    setChapters([]);
    setUploadResponse(null);
    setCurrentProgress(0);
    setProgressMessage(`File "${file.name}" selected. Ready to generate.`);
    toast.success(`File selected: ${file.name}`);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedFile) {
      toast.error('Please enter some text or upload a file.');
      return;
    }

    // Use a fresh state on each submission
    resetState(); 
    setIsLoading(true);
    setCurrentProgress(10);
    setProgressMessage('Preparing your content...');

    try {
      let response: UploadEbookResponse;
      setProgressMessage(selectedFile ? 'Uploading file...' : 'Uploading text content...');
      setCurrentProgress(25);

      if (selectedFile) {
        response = await uploadEbookFile(selectedFile);
      } else {
        response = await uploadEbookText(text);
      }

      setUploadResponse(response);
      toast.success(response.message || 'Content uploaded successfully!');
      setProgressMessage('Content processed, fetching chapters...');
      setCurrentProgress(50);

      if (response.ebook?.id) {
        const ebookId = response.ebook.id;
        setCurrentEbookId(ebookId);
        await fetchAndDisplayChapters(ebookId, true);
      } else {
        throw new Error('Ebook ID not found in upload response.');
      }
    } catch (err: any) {
      console.error('Processing failed:', err);
      toast.error(err.message || 'An unexpected error occurred during processing.');
      setProgressMessage('Error during processing. Please try again.');
      setCurrentProgress(0);
      setIsLoading(false);
    }
  };

  const fetchAndDisplayChapters = async (ebookId: string, shouldGenerateAudio: boolean) => {
    try {
      setProgressMessage('Fetching chapter details...');
      const detailsResponse = await getAudiobookDetails(ebookId);

      if (detailsResponse?.chapters?.length > 0) {
        setChapters(detailsResponse.chapters);
        const hasPending = detailsResponse.chapters.some(ch => ch.status === 'pending' || ch.status === 'pending_tts');

        if (shouldGenerateAudio && hasPending) {
          setProgressMessage('Starting audio generation...');
          setCurrentProgress(70);
          await generateAudioBatch(ebookId, selectedVoiceId);
          setIsPolling(true); // Start polling
        } else if (!hasPending) {
          setProgressMessage('All chapters already processed.');
          setCurrentProgress(100);
          setIsLoading(false);
        }
      } else {
        toast.warning('No chapters found for this ebook.');
        setChapters([]);
        setProgressMessage('No chapters found.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch chapter details:', err);
      toast.error(err.message || 'Could not fetch chapter details.');
      setProgressMessage('Error fetching chapters.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPolling || !currentEbookId) return;

    const poll = setInterval(async () => {
      try {
        const details = await getAudiobookDetails(currentEbookId);
        if (details?.chapters) {
          setChapters(details.chapters);
          const total = details.chapters.length;
          const completed = details.chapters.filter(ch => ch.status === 'complete').length;
          const errored = details.chapters.some(ch => ch.status === 'error_tts');
          const allDone = details.chapters.every(ch => ch.status === 'complete' || ch.status === 'error_tts');

          if (allDone) {
            setIsPolling(false);
            setIsLoading(false);
            setCurrentProgress(100);
            setProgressMessage(errored ? 'Generation complete with errors.' : 'Audiobook generation complete!');
            toast.success('Audiobook ready!');
          } else {
            setProgressMessage(`Generating audio... ${completed}/${total} chapters complete.`);
            setCurrentProgress(70 + (completed / total) * 30);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        toast.error('Failed to get status update. Stopping polling.');
        setIsPolling(false);
        setIsLoading(false);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(poll);
  }, [isPolling, currentEbookId]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const handlePlayChapter = (chapterId: string) => {
    const chapterToPlay = chapters.find(ch => ch.id === chapterId);
    if (!chapterToPlay || !chapterToPlay.audio_url) {
      toast.error('Audio for this chapter is not available.');
      return;
    }

    if (playingChapterId === chapterId) {
      currentAudio?.pause();
      setPlayingChapterId(null);
    } else {
      currentAudio?.pause();
      const newAudio = new Audio(chapterToPlay.audio_url);
      setCurrentAudio(newAudio);
      setPlayingChapterId(chapterId);
      newAudio.play().catch(e => {
        console.error('Error playing audio:', e);
        toast.error('Could not play audio.');
        setPlayingChapterId(null); // Reset on error
      });
      newAudio.onended = () => setPlayingChapterId(null);
    }
  };

  const handleDownloadChapter = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter?.audio_url) {
      toast.error('Audio not available for download.');
      return;
    }
    try {
      const response = await fetch(chapter.audio_url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeTitle = uploadResponse?.ebook?.title?.replace(/[^a-z0-9]/gi, '_') || 'ebook';
      const fileName = `${safeTitle}_chapter_${chapter.chapter_number}.mp3`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Download started!');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Could not download the file.');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Harmonic AI</CardTitle>
          <CardDescription>
            Transform your text or e-books into high-quality audiobooks with your chosen voice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <VoiceSelection selectedVoiceId={selectedVoiceId} onVoiceChange={setSelectedVoiceId} />
            <TextInputArea text={text} onTextChange={handleTextChange} />
            <div className="text-center text-sm text-gray-500">OR</div>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">{progressMessage}</span>
              <span className="text-sm font-bold">{Math.round(currentProgress)}%</span>
            </div>
            <Progress value={currentProgress} className="w-full" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetState} disabled={isLoading}>
            Start Over
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Generate Audiobook'}
          </Button>
        </CardFooter>
      </Card>

      {chapters.length > 0 && (
        <div className="mt-8">
          <ChapterList
            chapters={chapters}
            onPlayChapter={handlePlayChapter}
            onDownloadChapter={handleDownloadChapter}
            currentPlayingChapterId={playingChapterId}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
