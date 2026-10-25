import { getStoredUser } from '@/api/fetch-helpers';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('getStoredUser', () => {
  it('returns the user from sessionStorage first', () => {
    sessionStorage.setItem('user', JSON.stringify({ name: 'Session' }));
    localStorage.setItem('user', JSON.stringify({ name: 'Local' }));
    expect(getStoredUser()).toEqual({ name: 'Session' });
  });

  it('falls back to localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Local' }));
    expect(getStoredUser()).toEqual({ name: 'Local' });
  });

  it('returns null when nothing is stored', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    sessionStorage.setItem('user', '{not json');
    expect(getStoredUser()).toBeNull();
  });
});
