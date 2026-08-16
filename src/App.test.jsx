import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from './context/ThemeContext';

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

jest.mock('./api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

const App = require('./App').default;

test('renders the application without crashing', () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  expect(document.body).toBeTruthy();
});
