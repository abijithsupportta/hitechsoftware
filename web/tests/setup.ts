import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { Headers, Request, Response, fetch } from 'undici';

// Mock DOM container for React Testing Library
const createMockContainer = () => ({
  innerHTML: '',
  textContent: '',
  style: {},
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
    toggle: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(() => null),
  hasAttribute: vi.fn(() => false),
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  getElementsByTagName: vi.fn(() => []),
  getElementsByClassName: vi.fn(() => []),
  closest: vi.fn(() => null),
  matches: vi.fn(() => false),
  parentNode: null,
  parentElement: null,
  nextSibling: null,
  previousSibling: null,
  firstChild: null,
  lastChild: null,
  children: [],
  childNodes: [],
  nodeType: 1,
  nodeName: 'DIV',
  nodeValue: null,
  ownerDocument: global.document,
});

// Setup DOM container before each test
beforeEach(() => {
  // Create a mock container for React Testing Library
  const container = createMockContainer();
  (global.document.createElement as any) = vi.fn((tagName: string) => {
    const element = createMockContainer();
    (element as any).tagName = tagName.toUpperCase();
    return element;
  });
  
  // Mock createRoot for React 18
  const mockCreateRoot = vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  }));
  
  // Mock React DOM createRoot
  vi.mock('react-dom/client', () => ({
    createRoot: mockCreateRoot,
  }));
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    document: global.document,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((cb: any) => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn(),
    location: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: ''
    },
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn()
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Test Environment)'
    }
  },
  writable: true
});

// Mock document object with complete DOM API
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName: string) => ({
      tagName: tagName.toUpperCase(),
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
        toggle: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(() => null),
      hasAttribute: vi.fn(() => false),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      getElementsByTagName: vi.fn(() => []),
      getElementsByClassName: vi.fn(() => []),
      closest: vi.fn(() => null),
      matches: vi.fn(() => false),
      parentNode: null,
      parentElement: null,
      nextSibling: null,
      previousSibling: null,
      firstChild: null,
      lastChild: null,
      children: [],
      childNodes: [],
    })),
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    getElementsByTagName: vi.fn(() => []),
    getElementsByClassName: vi.fn(() => []),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
      style: {},
    },
    head: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    createTextNode: vi.fn(() => ({
      nodeValue: '',
      textContent: '',
    })),
    createDocumentFragment: vi.fn(() => ({
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    })),
    activeElement: null,
    readyState: 'complete',
  },
  writable: true
});

// Mock React Testing Library container
Object.defineProperty(global, 'document', {
  value: {
    ...global.document,
    body: {
      ...global.document.body,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
      },
    }
  },
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

type RouterMock = {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
};

type QueryBuilderResult = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
};

type QueryBuilderRecord = {
  table: string;
  selected?: string;
  operations: Array<{ method: string; args: unknown[] }>;
  result: QueryBuilderResult;
};

type AuthListener = ((event: string, session: unknown) => void | Promise<void>) | null;

const globalWithMocks = globalThis as typeof globalThis & {
  __HT_ROUTER__?: RouterMock;
  __HT_PATHNAME__?: string;
  __HT_PARAMS__?: Record<string, string>;
  __HT_SEARCH_PARAMS__?: URLSearchParams;
  __HT_SUPABASE__?: ReturnType<typeof createMockSupabaseClient>;
};

export const server = setupServer();

export const routerMock: RouterMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

let authListener: AuthListener = null;
const queryBuilders: QueryBuilderRecord[] = [];

function createChain(table: string, result: QueryBuilderResult = {}) {
  const record: QueryBuilderRecord = {
    table,
    operations: [],
    result: {
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? null,
    },
  };

  queryBuilders.push(record);

  const chain = {
    select: vi.fn((...args: unknown[]) => {
      record.selected = typeof args[0] === 'string' ? args[0] : undefined;
      record.operations.push({ method: 'select', args });
      return chain;
    }),
    insert: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'insert', args });
      return chain;
    }),
    update: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'update', args });
      return chain;
    }),
    delete: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'delete', args });
      return chain;
    }),
    eq: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'eq', args });
      return chain;
    }),
    neq: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'neq', args });
      return chain;
    }),
    is: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'is', args });
      return chain;
    }),
    not: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'not', args });
      return chain;
    }),
    lt: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'lt', args });
      return chain;
    }),
    lte: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'lte', args });
      return chain;
    }),
    gt: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'gt', args });
      return chain;
    }),
    gte: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'gte', args });
      return chain;
    }),
    or: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'or', args });
      return chain;
    }),
    order: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'order', args });
      return chain;
    }),
    range: vi.fn(async (...args: unknown[]) => {
      record.operations.push({ method: 'range', args });
      return {
        data: record.result.data ?? null,
        error: record.result.error ?? null,
        count: record.result.count ?? null,
      };
    }),
    limit: vi.fn((...args: unknown[]) => {
      record.operations.push({ method: 'limit', args });
      return chain;
    }),
    single: vi.fn(async (...args: unknown[]) => {
      record.operations.push({ method: 'single', args });
      return {
        data: record.result.data ?? null,
        error: record.result.error ?? null,
      };
    }),
    maybeSingle: vi.fn(async (...args: unknown[]) => {
      record.operations.push({ method: 'maybeSingle', args });
      return {
        data: record.result.data ?? null,
        error: record.result.error ?? null,
      };
    }),
    returns: vi.fn(async (...args: unknown[]) => {
      record.operations.push({ method: 'returns', args });
      return {
        data: record.result.data ?? null,
        error: record.result.error ?? null,
        count: record.result.count ?? null,
      };
    }),
  };

  return chain;
}

function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn((callback: AuthListener) => {
        authListener = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
    },
    from: vi.fn((table: string) => createChain(table)),
    rpc: vi.fn<(fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>>(async () => ({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
      })),
    },
  };
}

export const mockSupabaseClient = createMockSupabaseClient();

export function resetRouterMock() {
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  globalWithMocks.__HT_PATHNAME__ = '/';
  globalWithMocks.__HT_PARAMS__ = {};
  globalWithMocks.__HT_SEARCH_PARAMS__ = new URLSearchParams();
}

export function setRouterPathname(pathname: string) {
  globalWithMocks.__HT_PATHNAME__ = pathname;
}

export function setRouterParams(params: Record<string, string>) {
  globalWithMocks.__HT_PARAMS__ = params;
}

export function getLatestSupabaseQuery(table?: string) {
  if (!table) {
    return queryBuilders.at(-1) ?? null;
  }
  return [...queryBuilders].reverse().find((entry) => entry.table === table) ?? null;
}

export function clearSupabaseQueryHistory() {
  queryBuilders.length = 0;
}

export async function emitAuthStateChange(event: string, session: unknown) {
  if (!authListener) {
    throw new Error('Auth listener is not registered');
  }
  await authListener(event, session);
}

vi.mock('next/navigation', () => ({
  useRouter: () => globalWithMocks.__HT_ROUTER__ ?? routerMock,
  usePathname: () => globalWithMocks.__HT_PATHNAME__ ?? '/',
  useParams: () => globalWithMocks.__HT_PARAMS__ ?? {},
  useSearchParams: () => globalWithMocks.__HT_SEARCH_PARAMS__ ?? new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

beforeAll(() => {
  globalWithMocks.__HT_ROUTER__ = routerMock;
  globalWithMocks.__HT_PATHNAME__ = '/';
  globalWithMocks.__HT_PARAMS__ = {};
  globalWithMocks.__HT_SEARCH_PARAMS__ = new URLSearchParams();
  globalWithMocks.__HT_SUPABASE__ = mockSupabaseClient;
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
  globalThis.Headers = Headers as unknown as typeof globalThis.Headers;
  globalThis.Request = Request as unknown as typeof globalThis.Request;
  globalThis.Response = Response as unknown as typeof globalThis.Response;
  URL.createObjectURL = vi.fn(() => 'blob:test-url');
  URL.revokeObjectURL = vi.fn();
  server.listen({ onUnhandledRequest: 'bypass' });
});

beforeEach(() => {
  cleanup();
  resetRouterMock();
  clearSupabaseQueryHistory();
  authListener = null;
  mockSupabaseClient.auth.getSession.mockReset();
  mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.auth.getUser.mockReset();
  mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockSupabaseClient.auth.signInWithPassword.mockReset();
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
  mockSupabaseClient.auth.signOut.mockReset();
  mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.onAuthStateChange.mockClear();
  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.rpc.mockClear();
  mockSupabaseClient.storage.from.mockClear();
  server.resetHandlers();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export function mockRestQuery(table: string, data: JsonValue) {
  server.use(
    http.get(`*/rest/v1/${table}` , () => HttpResponse.json(data)),
  );
}

export function mockRestError(table: string, message: string, status = 400) {
  server.use(
    http.get(`*/rest/v1/${table}`, () => HttpResponse.json({ message }, { status })),
  );
}