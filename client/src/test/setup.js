/**
 * Test Setup File
 * Configures test environment for payment flow tests
 */

import { vi } from 'vitest';

// Mock window.location
delete window.location;
window.location = {
  href: '',
  origin: 'http://localhost:5173',
  search: '',
  pathname: '/',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn()
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3000';
process.env.VITE_TRANZILA_TERMINAL_NAME = 'test-terminal';

