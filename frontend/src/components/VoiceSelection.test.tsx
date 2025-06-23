
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import VoiceSelection from './VoiceSelection';

const mockOnVoiceChange = vi.fn();

const availableVoices = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Narrative)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Expressive)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Calm)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Upbeat)' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy (Mature)' },
];

describe('VoiceSelection', () => {
  it('renders the select element with the correct initial value', () => {
    render(<VoiceSelection selectedVoiceId="pNInz6obpgDQGcFmaJgB" onVoiceChange={mockOnVoiceChange} />);
    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toHaveValue('pNInz6obpgDQGcFmaJgB');
  });

  it('calls the onVoiceChange callback when a new voice is selected', () => {
    render(<VoiceSelection selectedVoiceId="pNInz6obpgDQGcFmaJgB" onVoiceChange={mockOnVoiceChange} />);
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'ErXwobaYiN019PkySvjV' } });
    expect(mockOnVoiceChange).toHaveBeenCalledWith('ErXwobaYiN019PkySvjV');
  });

  it('displays the correct number of voice options', () => {
    render(<VoiceSelection selectedVoiceId="pNInz6obpgDQGcFmaJgB" onVoiceChange={mockOnVoiceChange} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(availableVoices.length);
  });
});
