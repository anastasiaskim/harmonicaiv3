
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import TextInputArea from './TextInputArea';

const mockOnTextChange = vi.fn();

describe('TextInputArea', () => {
  it('renders the textarea with the correct initial value', () => {
    render(<TextInputArea text="Initial text" onTextChange={mockOnTextChange} />);
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveValue('Initial text');
  });

  it('calls the onTextChange callback when the text is changed', () => {
    render(<TextInputArea text="" onTextChange={mockOnTextChange} />);
    const textareaElement = screen.getByRole('textbox');
    fireEvent.change(textareaElement, { target: { value: 'New text' } });
    expect(mockOnTextChange).toHaveBeenCalledWith('New text');
  });

  it('displays the placeholder text when no text is provided', () => {
    render(<TextInputArea text="" onTextChange={mockOnTextChange} />);
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('placeholder', 'Paste your text here to convert it into an audiobook...');
  });

  it('displays a custom placeholder when provided', () => {
    render(<TextInputArea text="" onTextChange={mockOnTextChange} placeholder="Custom placeholder" />);
    const textareaElement = screen.getByRole('textbox');
    expect(textareaElement).toHaveAttribute('placeholder', 'Custom placeholder');
  });
});
