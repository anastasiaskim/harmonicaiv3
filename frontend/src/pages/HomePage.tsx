import React, { useState, useEffect, useCallback } from 'react';
import TextInputArea from '../components/TextInputArea';
import VoiceSelection from '../components/VoiceSelection';
import FileUpload from '../components/FileUpload';
import ChapterList, { Chapter } from '../components/ChapterList';
import { supabase } from '../supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import {
  uploadEbookText,
  uploadEbookFile,
  UploadEbookResponse,
  generateAudioBatch,
  // GenerateAudioBatchResponse, // No longer directly used as state
  getAudiobookDetails
} from '../services/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Toaster, toast } from "sonner";

const HomePage: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM'); // Default to Rachel
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null); // Replaced by toasts
  const [uploadResponse, setUploadResponse] = useState<UploadEbookResponse | null>(null);
  // const [batchAudioResponse, setBatchAudioResponse] = useState<GenerateAudioBatchResponse | null>(null); // Progress handled differently
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentEbookId, setCurrentEbookId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [chapterSubscription, setChapterSubscription] = useState<RealtimeChannel | null>(null);

  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('Ready to generate your audiobook.');

  const resetState = () => {
    setText('');
    setSelectedFile(null);
    // selectedVoiceId remains
    setIsLoading(false);
    setUploadResponse(null);
    setChapters([]);
    setCurrentEbookId(null);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setPlayingChapterId(null);
    if (chapterSubscription) {
      chapterSubscription.unsubscribe();
      setChapterSubscription(null);
    }
    setCurrentProgress(0);
    setProgressMessage('Ready to generate your audiobook.');
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (newText.trim() && selectedFile) {
      setSelectedFile(null); 
      toast.info("File selection cleared as text was entered.");
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
    console.log('File selected:', file.name);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedFile) {
      toast.error('Please enter some text or upload a file.');
      return;
    }

    setIsLoading(true);
    setCurrentProgress(10);
    setProgressMessage('Preparing your content...');
    setUploadResponse(null);
    setChapters([]);

    try {
      let currentUploadResponse: UploadEbookResponse;
      setProgressMessage(selectedFile ? 'Uploading file...' : 'Uploading text content...');
      setCurrentProgress(25);

      if (selectedFile) {
        currentUploadResponse = await uploadEbookFile(selectedFile);
      } else {
        currentUploadResponse = await uploadEbookText(text);
      }
      
      setUploadResponse(currentUploadResponse);
      toast.success(currentUploadResponse.message || 'Content uploaded successfully!');
      setProgressMessage('Content processed, fetching chapters...');
      setCurrentProgress(50);

      if (currentUploadResponse.ebook && currentUploadResponse.ebook.id) {
        const ebookId = currentUploadResponse.ebook.id;
        setCurrentEbookId(ebookId); 
        await fetchAndDisplayChapters(ebookId);
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
    // setIsLoading will be set to false in the Realtime effect after audio generation or error
  };

  const fetchAndDisplayChapters = async (ebookId: string) => {
    try {
      setProgressMessage('Fetching chapter details...');
      setCurrentProgress(60);
      const detailsResponse = await getAudiobookDetails(ebookId);
      if (detailsResponse && detailsResponse.chapters) {
        setChapters(detailsResponse.chapters);
        setProgressMessage('Chapter details loaded. Awaiting audio generation...');
        setCurrentProgress(70);
      } else {
        toast.warning('No chapters found for this ebook.');
        setChapters([]);
        setProgressMessage('No chapters found. Ready for new input.');
        setCurrentProgress(0);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch chapter details:', err);
      toast.error(err.message || 'Could not fetch chapter details.');
      setProgressMessage('Error fetching chapters. Please try again.');
      setCurrentProgress(0);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setPlayingChapterId(null);
      }
    };
  }, [currentAudio]);

  const handleChapterUpdate = useCallback((payload: RealtimePostgresChangesPayload<Chapter>) => {
    console.log('Chapter update received (RAW PAYLOAD):', payload);
    const updatedChapter = payload.new as Chapter;
    
    if (!updatedChapter || !updatedChapter.id) {
      console.log('Realtime event ignored (no new data or ID):', payload);
      return;
    }

    setChapters(prevChapters => {
      const newChapters = prevChapters.map(ch =>
        ch.id === updatedChapter.id ? { ...ch, ...updatedChapter } : ch
      );
      // Check if all chapters are complete or have errored
      const allProcessed = newChapters.every(ch => ch.status === 'complete' || ch.status === 'error_tts');
      const anyErrors = newChapters.some(ch => ch.status === 'error_tts');

      if (allProcessed) {
        setProgressMessage(anyErrors ? 'Audio generation complete with some errors.' : 'Audiobook generation complete!');
        setCurrentProgress(100);
        setIsLoading(false);
        if (anyErrors) toast.warning('Some chapters failed to generate audio.');
        else toast.success('Audiobook generated successfully!');
      } else {
        const completedCount = newChapters.filter(ch => ch.status === 'complete').length;
        setProgressMessage(`Generating audio... ${completedCount}/${newChapters.length} chapters complete.`);
        setCurrentProgress(70 + (completedCount / newChapters.length) * 30); 
      }
      return newChapters;
    });
  }, []);

  useEffect(() => {
    if (!currentEbookId) {
      if (chapterSubscription) {
        chapterSubscription.unsubscribe().then(() => console.log('Unsubscribed from chapter updates due to no currentEbookId'));
        setChapterSubscription(null);
      }
      return;
    }

    if (chapterSubscription) {
      chapterSubscription.unsubscribe().then(() => console.log('Unsubscribed from previous chapter updates channel.'));
    }

    const newChannel = supabase
      .channel(`chapters:ebook_id=eq.${currentEbookId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters', filter: `ebook_id=eq.${currentEbookId}`}, handleChapterUpdate)
      .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}` | 'SUBSCRIBED', err?: Error) => {
        if (status === 'SUBSCRIBED') {
          toast.info(`Subscribed to updates for ebook: ${currentEbookId.substring(0,8)}...`);
          setProgressMessage('Subscription active. Starting audio generation...');
          setCurrentProgress(70); 
          
          // Check if audio generation was already attempted (e.g., by a previous subscription instance for the same ebookId if component re-rendered)
          // This simple check might need refinement based on how `uploadResponse` is managed across re-renders or if `batchAudioResponse` state was kept.
          // For now, we assume if chapters are present and some are pending, we should try to generate.
          const hasPendingChapters = chapters.some(ch => ch.status === 'pending');
          if (currentEbookId && hasPendingChapters) { // Ensure ebookId is still current
            generateAudioBatch(currentEbookId, selectedVoiceId)
              .then(response => {
                // The actual progress update will happen via Realtime chapter updates
                console.log('Batch audio generation initiated:', response);
                if (response.failed_count > 0) {
                    toast.warning(`${response.failed_count} chapter(s) could not start audio generation.`);
                }
                if (response.successful_count === 0 && response.failed_count === 0 && chapters.length > 0) {
                    toast.info('All chapters seem to be processed or in progress already.');
                } else if (response.successful_count > 0) {
                    setProgressMessage(`Audio generation started for ${response.successful_count} chapter(s).`);
                }
              })
              .catch(batchErr => {
                console.error('Error in batch generation triggered from subscription:', batchErr);
                toast.error(batchErr.message || 'Failed to start audio generation.');
                setProgressMessage('Error starting audio generation.');
                setCurrentProgress(0);
                setIsLoading(false);
              });
          } else if (currentEbookId && chapters.length > 0 && !hasPendingChapters) {
             // All chapters might already be processed, check their status
            const allProcessed = chapters.every(ch => ch.status === 'complete' || ch.status === 'error_tts');
            if (allProcessed) {
                setProgressMessage('All chapters already processed.');
                setCurrentProgress(100);
                setIsLoading(false);
            }
          }
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Subscription error or timed out:', status, err);
          toast.error(`Realtime connection error: ${status}. Please try refreshing.`);
          setProgressMessage('Realtime connection error.');
          setCurrentProgress(0);
          setIsLoading(false);
        }
        if (err) {
            console.error('Realtime subscription error:', err);
            toast.error('Realtime subscription error.');
        }
      });

    setChapterSubscription(newChannel);

    return () => {
      if (newChannel) {
        newChannel.unsubscribe().then(() => console.log(`Unsubscribed from chapter updates for ebook: ${currentEbookId}`));
      }
    };
  }, [currentEbookId, selectedVoiceId, supabase, handleChapterUpdate, chapters]);

  const handleDownloadChapter = async (chapterId: string) => {
    const chapterToDownload = chapters.find(ch => ch.id === chapterId);
    if (!chapterToDownload || !chapterToDownload.audio_url) {
      toast.error('Audio for this chapter is not available for download.');
      return;
    }

    try {
      // Supabase Storage URLs are typically public and directly accessible if configured correctly.
      // The replace logic might be specific to local Docker setup if Kong is involved.
      const audioUrl = chapterToDownload.audio_url;

      toast.info(`Preparing download for ${chapterToDownload.title || 'chapter'}...`);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText} (URL: ${audioUrl})`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ebookTitle = uploadResponse?.ebook?.title?.replace(/[^a-z0-9]/gi, '_') || 'ebook';
      const fileName = `${ebookTitle}_chapter_${chapterToDownload.chapter_number}.mp3`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Downloading ${fileName}`);
    } catch (err: any) {
      console.error('Download failed:', err);
      toast.error(err.message || 'An unexpected error occurred during download.');
    }
  };

  const handlePlayChapter = (chapterId: string) => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null); 
      if (playingChapterId === chapterId) {
        setPlayingChapterId(null);
        return;
      }
    }

    const chapterToPlay = chapters.find(ch => ch.id === chapterId);

    if (chapterToPlay && chapterToPlay.audio_url) {
      const audioUrl = chapterToPlay.audio_url;
      console.log(`Playing audio from: ${audioUrl} for chapter ${chapterId}`);
      const newAudio = new Audio(audioUrl);

      newAudio.onplay = () => toast.info(`Playing: ${chapterToPlay.title || 'Chapter ' + chapterToPlay.chapter_number}`);
      newAudio.onended = () => {
        setPlayingChapterId(null);
        setCurrentAudio(null);
        toast.success(`Finished playing: ${chapterToPlay.title || 'Chapter ' + chapterToPlay.chapter_number}`);
      };
      newAudio.onerror = (e) => {
        console.error('Error playing audio:', e);
        toast.error(`Error playing audio for ${chapterToPlay.title || 'chapter ' + chapterToPlay.chapter_number}.`);
        setPlayingChapterId(null);
        setCurrentAudio(null);
      };

      newAudio.play().then(() => {
        setCurrentAudio(newAudio);
        setPlayingChapterId(chapterId);
      }).catch(e => {
        console.error('Error starting audio playback:', e);
        toast.error(`Could not start audio for ${chapterToPlay.title || 'chapter ' + chapterToPlay.chapter_number}.`);
        setPlayingChapterId(null);
        setCurrentAudio(null);
      });
    } else {
      toast.error('Audio for this chapter is not available.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 md:p-8">

      <Toaster richColors position="top-right" />
      <div className="container mx-auto max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Harmonic AI</h1>
          <p className="text-xl text-muted-foreground">Transform text or files into engaging audiobooks with your chosen voice.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Card className="md:sticky md:top-8">
            <CardHeader>
              <CardTitle>Create Your Audiobook</CardTitle>
              <CardDescription>Enter text directly, upload a file, and select a voice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <TextInputArea 
                text={text} 
                onTextChange={handleTextChange} 
                placeholder="Paste your content here (e.g., a book chapter, an article). Chapters will be automatically detected based on common patterns or you can denote them with '---CHAPTER BREAK---' on a new line."
              />
              <FileUpload onFileSelect={handleFileSelect} acceptedFileTypes=".txt,.epub,.pdf" />
              {selectedFile && (
                <div className="text-sm text-muted-foreground p-3 border rounded-md">
                  Selected file: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
                </div>
              )}
              <VoiceSelection 
                selectedVoiceId={selectedVoiceId} 
                onVoiceChange={setSelectedVoiceId} 
              />
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading || (!text.trim() && !selectedFile)}
              >
                {isLoading ? 'Processing...' : 'Generate Audiobook'}
              </Button>
              {isLoading && (
                <div className="text-sm text-center text-muted-foreground">Please wait, this may take a few moments.</div>
              )}
              <Button variant="outline" size="sm" onClick={resetState} disabled={isLoading && currentProgress > 0 && currentProgress < 100}>
                Reset Form
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Audiobook Chapters</CardTitle>
              <CardDescription>
                {chapters.length > 0 ? 'Play, download, or monitor the status of your audiobook chapters below.' : 'Your generated chapters will appear here.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(isLoading || chapters.length > 0) && (
                <div className="space-y-2">
                  <Progress value={currentProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">{progressMessage}</p>
                </div>
              )}
              
              {chapters.length > 0 && (
                <ChapterList 
                  chapters={chapters}
                  onPlayChapter={handlePlayChapter}
                  onDownloadChapter={handleDownloadChapter}
                  currentPlayingChapterId={playingChapterId}
                />
              )}
              {!isLoading && chapters.length === 0 && currentEbookId && (
                 <p className="text-sm text-muted-foreground text-center">No chapters found for the processed content. Try a different input.</p>
              )}
              {!isLoading && chapters.length === 0 && !currentEbookId && (
                 <p className="text-sm text-muted-foreground text-center">Submit content to see chapters here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
