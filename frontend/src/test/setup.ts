import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Browser APIs Ant Design reads and jsdom does not implement.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Deciding whether an element is hidden reads its computed style and its ancestors'. Under jsdom that walks every rule
// Ant Design injects, so one role query took seconds once a page held a calendar. Queries skip that check; a page hides
// what a role cannot use by not rendering it, which every `queryBy...` still notices.
configure({ defaultHidden: true });
