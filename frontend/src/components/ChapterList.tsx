import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Download,
  Loader2, // Spinner icon
  CircleCheck, // Success icon
  CircleAlert, // Error icon
  Hourglass, // Pending icon
} from 'lucide-react';

export interface Chapter {
  id: string;
  title: string | null;
  chapter_number: number;
  status: 'pending_tts' | 'processing_tts' | 'complete' | 'error_tts' | string;
  audio_url: string | null;
}

interface ChapterListProps {
  chapters: Chapter[];
  onPlayChapter: (chapterId: string) => void;
  onDownloadChapter: (chapterId: string) => void;
  currentPlayingChapterId?: string | null;
}

const ChapterList: React.FC<ChapterListProps> = ({ 
  chapters, 
  onPlayChapter,
  onDownloadChapter, 
  currentPlayingChapterId
}) => {
  if (!chapters || chapters.length === 0) {
    // This case is handled by the parent component (HomePage) now, 
    // but good to keep a fallback or remove if HomePage guarantees chapters are present when list is shown.
    // For now, let's assume HomePage handles the "no chapters" message.
    return null;
  }

  const getStatusBadge = (status: Chapter['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="success" className="flex items-center"><CircleCheck className="mr-1 h-3 w-3" /> Complete</Badge>;
      case 'processing_tts':
        return <Badge variant="outline" className="flex items-center text-blue-600 border-blue-600"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>;
      case 'pending_tts':
        return <Badge variant="secondary" className="flex items-center"><Hourglass className="mr-1 h-3 w-3" /> Pending</Badge>;
      case 'error_tts':
        return <Badge variant="destructive" className="flex items-center"><CircleAlert className="mr-1 h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => (
        <div 
          key={chapter.id} 
          role="listitem"
          aria-label={`${chapter.chapter_number}. ${chapter.title || `Chapter ${chapter.chapter_number}`}`}
          className={`p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all
                      ${currentPlayingChapterId === chapter.id ? 'bg-muted/50 border-primary' : 'bg-card hover:bg-muted/30'}`}
        >
          <div className="flex-grow">
            <h4 className="font-semibold text-card-foreground">
              {chapter.chapter_number}. {chapter.title || `Chapter ${chapter.chapter_number}`}
            </h4>
            <div className="mt-1">
              {getStatusBadge(chapter.status)}
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 mt-2 sm:mt-0">
            {chapter.status === 'complete' && chapter.audio_url ? (
              <>
                <Button
                  variant={currentPlayingChapterId === chapter.id ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    console.log('Play button clicked for chapter:', chapter);
                    console.log('Chapter status:', chapter.status);
                    console.log('Chapter audio_url:', chapter.audio_url);
                    onPlayChapter(chapter.id);
                  }}
                  aria-label={currentPlayingChapterId === chapter.id ? `Stop chapter ${chapter.chapter_number}` : `Play chapter ${chapter.chapter_number}`}
                >
                  {currentPlayingChapterId === chapter.id ? 
                    <Pause className="mr-2 h-4 w-4" /> : 
                    <Play className="mr-2 h-4 w-4" />
                  }
                  {currentPlayingChapterId === chapter.id ? 'Stop' : 'Play'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDownloadChapter(chapter.id)}
                  aria-label={`Download chapter ${chapter.chapter_number}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                <Play className="mr-2 h-4 w-4" /> Play
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChapterList;
