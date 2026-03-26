import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Setup DOM environment for performance tests
import { JSDOM } from 'jsdom';

// Create a DOM environment for performance tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Set up global DOM objects
Object.defineProperty(window, 'location', {
  value: dom.window.location,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: dom.window.document,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: dom.window,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
});

// Mock IntersectionObserver for performance tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for performance tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame for performance tests
global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  const id = setTimeout(() => cb(Date.now()), 16) as unknown as number;
  return id;
});
global.cancelAnimationFrame = vi.fn((id: number) => clearTimeout(id));

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  dom.window.close();
});
