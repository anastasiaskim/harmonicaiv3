import React from 'react';

// This would typically come from an API or a more dynamic source
const availableVoices = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Narrative)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Expressive)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Calm)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Upbeat)' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy (Mature)' }, // Added a descriptive type for Dorothy
];

interface VoiceSelectionProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
}

const VoiceSelection: React.FC<VoiceSelectionProps> = ({ selectedVoiceId, onVoiceChange }) => {
  return (
    <div className="my-4">
      <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-1">
        Choose a Voice:
      </label>
      <select
        id="voice-select"
        name="voice-select"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        value={selectedVoiceId}
        onChange={(e) => onVoiceChange(e.target.value)}
      >
        {availableVoices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceSelection;
