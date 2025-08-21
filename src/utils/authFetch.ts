// src/utils/authFetch.ts
export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const res = await fetch(input, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
  });

  // Handle session missing/expired
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:changed'));
    localStorage.clear(); sessionStorage.clear();
    if (location.pathname !== '/signin') location.href = '/signin';
    // Throw a recognizable error so caller stops further work
    const err: any = new Error('Session expired');
    err.__authRedirect = true;
    throw err;
  }

  // Handle forbidden (role mismatch etc.)
  if (res.status === 403) {
    if (location.pathname !== '/403') location.href = '/403';
    const err: any = new Error('Forbidden');
    err.__authRedirect = true;
    throw err;
  }

  return res;
}
