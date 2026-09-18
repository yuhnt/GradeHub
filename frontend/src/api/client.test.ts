import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_KEY } from '../auth/tokenStorage';
import { server } from '../test/server';
import { ApiError, api, setUnauthorizedHandler } from './client';

describe('api client', () => {
  afterEach(() => setUnauthorizedHandler(undefined));

  it('sends the stored token as a Bearer header', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    let auth: string | null = null;
    server.use(
      http.get('*/api/ping', ({ request }) => {
        auth = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(api.get('/ping')).resolves.toEqual({ ok: true });
    expect(auth).toBe('Bearer abc.def.ghi');
  });

  it('turns the { error } body into an ApiError', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({ error: 'task not found' }, { status: 404 })));
    const error = await api.get('/ping').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'task not found' });
  });

  it('copes with a non-JSON error page from a proxy', async () => {
    server.use(http.post('*/api/ping', () => new HttpResponse('<html>Too large</html>', { status: 413 })));
    await expect(api.post('/ping')).rejects.toMatchObject({ status: 413, message: 'file too large' });
  });

  it('reports an unreachable server as status 0', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.error()));
    await expect(api.get('/ping')).rejects.toMatchObject({ status: 0, message: 'network error' });
  });

  it('signals an ended session on a 401 when a token was sent', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    server.use(http.get('*/api/ping', () => HttpResponse.json({ error: 'invalid or expired token' }, { status: 401 })));

    await expect(api.get('/ping')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled(); // no token: a failed sign-in, not an expiry

    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    await expect(api.get('/ping')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('adds query parameters, skipping undefined ones', async () => {
    let url = '';
    server.use(
      http.get('*/api/tasks', ({ request }) => {
        url = request.url;
        return HttpResponse.json({});
      }),
    );
    await api.get('/tasks', { query: { page: 2, mine: undefined, status: 'open' } });
    expect(new URL(url).search).toBe('?page=2&status=open');
  });
});
