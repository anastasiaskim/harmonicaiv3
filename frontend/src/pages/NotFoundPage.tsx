import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div data-testid="not-found-page" className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
      <p className="text-gray-500 mb-8">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link 
        to="/"
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors duration-300"
      >
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;
