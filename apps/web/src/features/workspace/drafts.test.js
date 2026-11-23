import {
  DRAFT_FILE_MAX_CHARS,
  DRAFT_MAX_CHARS,
  DRAFT_TTL_MS,
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from './drafts.js';

const FILES = [
  { path: 'index.html', content: '<h1>Hi</h1>' },
  { path: 'script.js', content: 'let a = 1;' },
];
const KEY = draftKey('c1', 'p1', 'v1');

beforeEach(() => window.localStorage.clear());

describe('drafts', () => {
  it('keys drafts by owner, project and version', () => {
    expect(draftKey('c1', 'p1', 'v1')).not.toBe(draftKey('c2', 'p1', 'v1'));
    expect(draftKey('c1', 'p1', 'v1')).not.toBe(draftKey('c1', 'p1', 'v2'));
  });

  it('saves and loads edits, and removes the draft when there are none', () => {
    saveDraft(KEY, { 'script.js': 'let a = 2;' });
    expect(loadDraft(KEY, FILES)).toEqual({ 'script.js': 'let a = 2;' });
    saveDraft(KEY, {});
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(loadDraft(KEY, FILES)).toBeNull();
  });

  it('expires old drafts', () => {
    saveDraft(KEY, { 'script.js': 'x' }, Date.now() - DRAFT_TTL_MS - 1000);
    expect(loadDraft(KEY, FILES)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores unknown files, non-text, oversized and unchanged content', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        savedAt: Date.now(),
        edits: {
          'evil.js': 'x',
          'index.html': 42,
          'script.js': 'a'.repeat(DRAFT_FILE_MAX_CHARS + 1),
        },
      }),
    );
    expect(loadDraft(KEY, FILES)).toBeNull();
    saveDraft(KEY, { 'script.js': 'let a = 1;' }); // identical to the saved file
    expect(loadDraft(KEY, FILES)).toBeNull();
  });

  it('does not save drafts over the size cap and does not touch an older draft', () => {
    saveDraft(KEY, { 'script.js': 'small' });
    saveDraft(KEY, { 'script.js': 'a'.repeat(DRAFT_MAX_CHARS + 1) });
    expect(loadDraft(KEY, FILES)).toEqual({ 'script.js': 'small' });
  });

  it('survives corrupt data and blocked storage', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(loadDraft(KEY, FILES)).toBeNull();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadDraft(KEY, FILES)).toBeNull();
    spy.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveDraft(KEY, { 'script.js': 'x' })).not.toThrow();
    set.mockRestore();
    expect(() => clearDraft(KEY)).not.toThrow();
  });
});
