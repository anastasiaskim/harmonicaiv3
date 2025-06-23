
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders with the correct initial value', () => {
    render(<Progress value={50} />);
    const progressIndicator = screen.getByRole('progressbar');
    expect(progressIndicator).toBeInTheDocument();
  });

  it('sets the transform style correctly based on the value', () => {
    render(<Progress value={75} />);
    const progressIndicator = screen.getByRole('progressbar').firstChild as HTMLElement;
    expect(progressIndicator.style.transform).toBe('translateX(-25%)');
  });

  it('handles a value of 0', () => {
    render(<Progress value={0} />);
    const progressIndicator = screen.getByRole('progressbar').firstChild as HTMLElement;
    expect(progressIndicator.style.transform).toBe('translateX(-100%)');
  });

  it('handles a value of 100', () => {
    render(<Progress value={100} />);
    const progressIndicator = screen.getByRole('progressbar').firstChild as HTMLElement;
    expect(progressIndicator.style.transform).toBe('translateX(-0%)');
  });

  it('applies custom className', () => {
    render(<Progress value={50} className="custom-progress" />);
    const progressElement = screen.getByRole('progressbar');
    expect(progressElement).toHaveClass('custom-progress');
  });
});
