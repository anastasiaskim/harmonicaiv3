import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import '@testing-library/jest-dom';

// Mock HomePage to simplify App routing tests
// We only care that the correct component is routed to, not its full rendering.
vi.mock('./pages/HomePage', () => ({
  default: () => <div data-testid="home-page">HomePageMock</div>,
}));

// Mock NotFoundPage
vi.mock('./pages/NotFoundPage', () => ({
  default: () => <div data-testid="not-found-page">NotFoundPageMock</div>,
}));


describe('App Routing', () => {
  test('should render HomePage component for the root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    // Check for the mock's test ID or a prominent, unique text from the actual HomePage
    // If not mocking HomePage, you'd look for actual HomePage content:
    // expect(screen.getByText('Harmonic AI')).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  test('should render a not found message or redirect for an unknown path', () => {
    render(
      <MemoryRouter initialEntries={['/some-unknown-path']}>
        <App />
      </MemoryRouter>
    );
    // Check for the mock's test ID or a prominent, unique text from the actual NotFoundPage
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
  });
});
