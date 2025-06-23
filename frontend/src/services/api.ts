import { supabase } from '../supabaseClient';

export interface UploadEbookResponse {
  message: string;
  ebook: {
    id: string;
    created_at: string;
    original_file_name: string | null;
    original_file_type: string | null;
    status: string | null;
    extracted_text_preview: string | null;
    user_id: string | null;
    title: string | null;
    author: string | null;
    cover_image_url: string | null;
  };
  chapter: {
    id: string;
    ebook_id: string;
    chapter_number: number;
    title: string | null;
    text_content: string;
    audio_url: string | null;
    audio_duration_seconds: number | null;
    status: string;
    created_at: string;
  };
}

export const uploadEbookText = async (inputText: string): Promise<UploadEbookResponse> => {
  if (!inputText.trim()) {
    throw new Error('Input text cannot be empty.');
  }

  const { data, error } = await supabase.functions.invoke('upload-ebook', {
    body: { inputText },
  });

  if (error) {
    console.error('Error invoking upload-ebook function:', error);
    throw new Error(`Failed to upload ebook: ${error.message}`);
  }

  return data as UploadEbookResponse;
};

export const uploadEbookFile = async (file: File): Promise<UploadEbookResponse> => {
  if (!file) {
    throw new Error('File cannot be empty.');
  }


  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('upload-ebook', {
    body: formData,
    // IMPORTANT: When sending FormData, Supabase client might automatically set Content-Type.
    // If issues arise, you might need to manage headers explicitly or ensure the client handles it.
    // For `invoke`, it should handle FormData correctly by default.
  });

  if (error) {
    console.error('Error invoking upload-ebook function with file:', error);
    throw new Error(`Failed to upload ebook file: ${error.message}`);
  }

  return data as UploadEbookResponse;
};

export interface GenerateAudioResponse {
  message: string;
  chapter_id: string;
  voice_id: string;
  audio_url: string;
  // Add any other fields returned by your generate-audio-from-text function
}

export const generateAudioFromChapter = async (chapterId: string, voiceId: string): Promise<GenerateAudioResponse> => {
  if (!chapterId) {
    throw new Error('Chapter ID cannot be empty.');
  }
  if (!voiceId) {
    throw new Error('Voice ID cannot be empty.');
  }

  const { data, error } = await supabase.functions.invoke('generate-audio-from-text', {
    body: { chapter_id: chapterId, voice_id: voiceId },
  });

  if (error) {
    console.error('Error invoking generate-audio-from-text function:', error);
    throw new Error(`Failed to generate audio: ${error.message}`);
  }

  // Assuming the function returns data directly that matches GenerateAudioResponse
  // If the actual data is nested (e.g., data.data), adjust accordingly.
  return data as GenerateAudioResponse;
};

export interface BatchChapterResult {
  chapter_id: string;
  status: 'success' | 'failed';
  audio_url?: string;
  error?: string;
}

export interface GenerateAudioBatchResponse {
  message: string;
  successful_count: number;
  failed_count: number;
  results: BatchChapterResult[];
}

export const generateAudioBatch = async (ebookId: string, voiceId: string): Promise<GenerateAudioBatchResponse> => {
  if (!ebookId) {
    throw new Error('Ebook ID cannot be empty.');
  }
  if (!voiceId) {
    throw new Error('Voice ID cannot be empty.');
  }

  const { data, error } = await supabase.functions.invoke('generate-audio-from-text', {
    body: { ebook_id: ebookId, voice_id: voiceId },
  });

  if (error) {
    console.error('Error invoking generate-audio-batch function:', error);
    throw new Error(`Failed to generate audio batch: ${error.message}`);
  }

  return data as GenerateAudioBatchResponse;
};

// Interface for the structure of a single chapter, matching ChapterList.tsx
export interface ChapterDetail {
  id: string;
  chapter_number: number;
  title: string | null;
  text_content: string; // Or just a preview, depending on backend
  audio_url: string | null;
  audio_duration_seconds: number | null;
  status: string;
  created_at: string;
  // Add any other fields your 'get-audiobook-details' function returns for a chapter
}

// Interface for the overall response from get-audiobook-details
export interface AudiobookDetailsResponse {
  ebook: {
    id: string;
    title: string | null;
    author: string | null;
    cover_image_url: string | null;
    status: string | null;
    // Add other ebook fields as needed
  };
  chapters: ChapterDetail[];
  message?: string; // Optional message
}

export const getAudiobookDetails = async (ebookId: string): Promise<AudiobookDetailsResponse> => {
  if (!ebookId) {
    throw new Error('Ebook ID cannot be empty.');
  }

  // The ebook_id is passed as a query parameter
  const { data, error } = await supabase.functions.invoke(`get-audiobook-details?ebook_id=${ebookId}`, {
    method: 'GET', // Explicitly set method to GET
  });

  if (error) {
    console.error('Error invoking get-audiobook-details function:', error);
    throw new Error(`Failed to fetch audiobook details: ${error.message}`);
  }

  return data as AudiobookDetailsResponse;
};
