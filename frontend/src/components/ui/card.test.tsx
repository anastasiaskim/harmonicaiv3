
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';

describe('Card and its components', () => {
  it('renders Card with custom className', () => {
    render(<Card className="custom-card">Card Content</Card>);
    const cardElement = screen.getByText('Card Content');
    expect(cardElement).toHaveClass('custom-card');
  });

  it('renders CardHeader with custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    const headerElement = screen.getByText('Header');
    expect(headerElement).toHaveClass('custom-header');
  });

  it('renders CardTitle with custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    const titleElement = screen.getByText('Title');
    expect(titleElement).toHaveClass('custom-title');
  });

  it('renders CardDescription with custom className', () => {
    render(<CardDescription className="custom-description">Description</CardDescription>);
    const descriptionElement = screen.getByText('Description');
    expect(descriptionElement).toHaveClass('custom-description');
  });

  it('renders CardContent with custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    const contentElement = screen.getByText('Content');
    expect(contentElement).toHaveClass('custom-content');
  });

  it('renders CardFooter with custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);
    const footerElement = screen.getByText('Footer');
    expect(footerElement).toHaveClass('custom-footer');
  });

  it('renders CardAction with custom className', () => {
    render(<CardAction className="custom-action">Action</CardAction>);
    const actionElement = screen.getByText('Action');
    expect(actionElement).toHaveClass('custom-action');
  });
});
