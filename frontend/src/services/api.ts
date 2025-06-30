import { supabase } from '../supabaseClient';
import { getSupabaseConfig } from '../utils/configHelper';

// Represents a single chapter returned by the upload-ebook function
export interface Chapter {
  id: string;
  ebook_id: string;
  chapter_number: number;
  part_number: number;
  title: string | null;
  text_content: string;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  status: string;
  created_at: string;
}

// Represents the successful response from the upload-ebook function
export interface UploadEbookResponse {
  ebook_id: string;
  chapters: Chapter[];
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
    const { url, hasKey } = getSupabaseConfig();
    console.error('Supabase client configuration:', {
      url,
      hasKey,
      functionUrl: `${url}/functions/v1/upload-ebook`
    });
    throw new Error(`Failed to upload ebook: ${error.message}`);
  }

  return data as UploadEbookResponse;
};

export const uploadEbookFile = async (file: File, accessToken: string): Promise<UploadEbookResponse> => {
  if (!file) {
    throw new Error('File cannot be empty.');
  }
  if (!accessToken) {
    throw new Error('Authentication token is required');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-ebook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upload ebook file: ${errorMessage}`);
  }
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

// Represents the response from the asynchronous audio generation trigger
export interface StartAudioGenerationResponse {
  message: string;
}

/**
 * Triggers the asynchronous generation of audio for all pending chapters of an ebook.
 * This function returns immediately with a 202 Accepted status.
 * The actual audio generation happens in the background.
 * @param ebookId The ID of the ebook.
 * @param voiceId The ID of the voice to use for generation.
 * @returns A promise that resolves with a confirmation message.
 */
export const startAudioGeneration = async (ebookId: string, voiceId: string): Promise<StartAudioGenerationResponse> => {
  if (!ebookId) {
    throw new Error('Ebook ID cannot be empty.');
  }
  if (!voiceId) {
    throw new Error('Voice ID cannot be empty.');
  }

  const { data, error } = await supabase.functions.invoke('start-audio-generation', {
    body: { ebook_id: ebookId, voice_id: voiceId },
  });

  if (error) {
    console.error('Error invoking start-audio-generation function:', error);
    throw new Error(`Failed to start audio generation: ${error.message}`);
  }

  return data as StartAudioGenerationResponse;
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
