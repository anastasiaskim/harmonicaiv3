import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import TextInputArea from '../components/TextInputArea';
import VoiceSelection from '../components/VoiceSelection';
import FileUpload from '../components/FileUpload';
import ChapterList, { Chapter } from '../components/ChapterList';
import {
  uploadEbookText,
  uploadEbookFile,
  UploadEbookResponse,
  startAudioGeneration,
  getAudiobookDetails,
  AudiobookDetailsResponse,
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
import { supabase } from '../supabaseClient';

const POLLING_INTERVAL = 5000; // 5 seconds

const HomePage: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM'); // Default to Rachel
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentEbookId, setCurrentEbookId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('Ready to generate your audiobook.');
  const [ebookDetails, setEbookDetails] = useState<AudiobookDetailsResponse['ebook'] | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setText('');
    setSelectedFile(null);
    setIsLoading(false);
    setChapters([]);
    setCurrentEbookId(null);
    setEbookDetails(null);
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
    setCurrentProgress(0);
    setProgressMessage(`File "${file.name}" selected. Ready to generate.`);
    toast.success(`File selected: ${file.name}`);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedFile) {
      toast.error('Please enter some text or upload a file.');
      return;
    }
    
    if (!session) {
      toast.error('Not authenticated. Please sign in again.');
      return;
    }

    setChapters([]);
    setCurrentEbookId(null);
    setIsLoading(true);
    setCurrentProgress(10);
    setProgressMessage('Preparing your content...');

    try {
      let response: UploadEbookResponse;
      setProgressMessage(selectedFile ? 'Uploading file...' : 'Uploading text content...');
      setCurrentProgress(25);

      if (selectedFile) {
        response = await uploadEbookFile(selectedFile, session.access_token);
      } else {
        response = await uploadEbookText(text);
      }

      toast.success('Content uploaded successfully!');
      setProgressMessage('Content processed, fetching chapters...');
      setCurrentProgress(50);

      if (response.ebook_id) {
        const ebookId = response.ebook_id;
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
      setEbookDetails(detailsResponse.ebook);

      if (detailsResponse?.chapters?.length > 0) {
        setChapters(detailsResponse.chapters);
        const hasPending = detailsResponse.chapters.some(ch => ch.status === 'pending' || ch.status === 'pending_tts');

        if (shouldGenerateAudio && hasPending) {
          setProgressMessage('Starting audio generation...');
          setCurrentProgress(70);
          const response = await startAudioGeneration(ebookId, selectedVoiceId);
          toast.info(response.message); // Inform the user that the process has started
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

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const handlePlayChapter = (chapterId: string) => {
    const chapterToPlay = chapters.find(ch => ch.id === chapterId);
    console.log('Chapter to play:', chapterToPlay);
    
    if (!chapterToPlay) {
      console.error('Chapter not found:', chapterId);
      toast.error('Chapter not found.');
      return;
    }
    
    if (!chapterToPlay.audio_url) {
      console.error('Audio URL is missing for chapter:', chapterId);
      toast.error('Audio for this chapter is not available.');
      return;
    }
    
    console.log('Attempting to play audio from URL:', chapterToPlay.audio_url);

    if (playingChapterId === chapterId) {
      console.log('Stopping playback of current chapter');
      currentAudio?.pause();
      setPlayingChapterId(null);
    } else {
      currentAudio?.pause();
      
      // Test if the audio URL is accessible
      fetch(chapterToPlay.audio_url, { method: 'HEAD' })
        .then(response => {
          console.log('Audio URL fetch response:', response);
          if (!response.ok) {
            throw new Error(`Audio file not accessible: ${response.status} ${response.statusText}`);
          }
          return response;
        })
        .then(() => {
          console.log('Creating new Audio object with URL:', chapterToPlay.audio_url);
          const newAudio = new Audio(chapterToPlay.audio_url);
          
          // Add more detailed error handling
          newAudio.onerror = (e) => {
            console.error('Audio error event:', e);
            console.error('Audio error code:', (newAudio.error ? newAudio.error.code : 'unknown'));
            console.error('Audio error message:', (newAudio.error ? newAudio.error.message : 'unknown'));
            toast.error(`Audio error: ${newAudio.error ? newAudio.error.message : 'Unknown error'}`);
            setPlayingChapterId(null);
          };
          
          newAudio.onloadstart = () => console.log('Audio loading started');
          newAudio.oncanplay = () => console.log('Audio can start playing');
          newAudio.onended = () => {
            console.log('Audio playback ended');
            setPlayingChapterId(null);
          };
          
          setCurrentAudio(newAudio);
          setPlayingChapterId(chapterId);
          
          console.log('Attempting to play audio...');
          newAudio.play().catch(e => {
            console.error('Error playing audio:', e);
            toast.error(`Could not play audio: ${e.message}`);
            setPlayingChapterId(null);
          });
        })
        .catch(error => {
          console.error('Error accessing audio file:', error);
          toast.error(`Could not access audio file: ${error.message}`);
        });
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
      const safeTitle = ebookDetails?.title?.replace(/[^a-z0-9]/gi, '_') || 'ebook';
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

  if (!session) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center h-screen">
        <div className="w-full max-w-md">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'github']}
            theme="dark"
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Toaster richColors position="top-right" />
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Harmonic AI</CardTitle>
            <CardDescription>
              Welcome, {session.user.email}! Transform your text or e-books into high-quality audiobooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <VoiceSelection selectedVoiceId={selectedVoiceId} onVoiceChange={setSelectedVoiceId} />
              <TextInputArea text={text} onTextChange={handleTextChange} />
              <div className="text-center text-sm text-gray-500">OR</div>
              <FileUpload onFileSelect={handleFileSelect} />
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Create New Audiobook</h2>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">{progressMessage}</span>
                <span className="text-sm font-bold">{Math.round(currentProgress)}%</span>
              </div>
              <Progress value={currentProgress} className="w-full" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <Button variant="outline" onClick={resetState} disabled={isLoading} className="mr-2">
                Start Over
              </Button>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                Sign Out
              </Button>
            </div>
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
  }
};

export default HomePage;