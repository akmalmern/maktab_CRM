import axios from 'axios';
import i18n from '../i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const REFRESH_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 15000;
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REFRESH_TIMEOUT_MS,
});

let tokenGetter = null;
let refreshSuccessHandler = null;
let authFailHandler = null;

let isRefreshing = false;
let refreshQueue = [];

let requestInterceptorId = null;
let responseInterceptorId = null;

function readCookie(cookieName) {
  if (typeof document === 'undefined') return null;
  const cookies = String(document.cookie || '').split(';');
  for (const rawCookie of cookies) {
    const [namePart, ...valueParts] = rawCookie.trim().split('=');
    if (namePart !== cookieName) continue;
    const encodedValue = valueParts.join('=');
    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return encodedValue;
    }
  }
  return null;
}

function shouldAttachCsrfHeader(method) {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  return !SAFE_HTTP_METHODS.has(normalizedMethod);
}

function attachCsrfHeader(headers, method) {
  if (!shouldAttachCsrfHeader(method)) return;
  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) return;
  headers[CSRF_HEADER_NAME] = token;
}

function normalizeAxiosError(error) {
  if (error?.isNormalizedApiError) return error;

  const message =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Noma`lum xatolik';

  const normalized = new Error(message);
  normalized.cause = error;
  normalized.stack = error?.stack || normalized.stack;
  normalized.status = error?.response?.status ?? null;
  normalized.payload = error?.response?.data ?? null;
  normalized.isNormalizedApiError = true;
  return normalized;
}

function flushQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

function shouldSkipRefresh(url = '') {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  );
}

function getApiErrorCode(error) {
  return (
    error?.response?.data?.error?.code ||
    error?.response?.data?.code ||
    null
  );
}

function resolveLangHeaderValue() {
  const lang = i18n.language?.split('-')?.[0];
  if (lang === 'ru' || lang === 'en' || lang === 'uz') return lang;
  return 'uz';
}

function attachInterceptors() {
  if (requestInterceptorId !== null) {
    api.interceptors.request.eject(requestInterceptorId);
  }

  if (responseInterceptorId !== null) {
    api.interceptors.response.eject(responseInterceptorId);
  }

  requestInterceptorId = api.interceptors.request.use((config) => {
    const token = tokenGetter ? tokenGetter() : null;

    config.headers = config.headers || {};
    const lang = resolveLangHeaderValue();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    attachCsrfHeader(config.headers, config.method);
    config.headers['X-Lang'] = lang;
    config.headers['Accept-Language'] = lang;
    return config;
  });

  responseInterceptorId = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config || {};
      const status = error?.response?.status;
      const url = original?.url || '';
      const code = getApiErrorCode(error);

      // Business-level credential errors (for example wrong current password in settings)
      // should be shown to the user, not treated as a broken auth session.
      if (status !== 401 || original._retry || shouldSkipRefresh(url) || code === 'INVALID_CREDENTIALS') {
        throw normalizeAxiosError(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((queuedError) => {
            throw normalizeAxiosError(queuedError);
          });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshHeaders = {
          'X-Lang': resolveLangHeaderValue(),
          'Accept-Language': resolveLangHeaderValue(),
        };
        attachCsrfHeader(refreshHeaders, 'POST');
        const refreshResponse = await refreshClient.post(
          '/api/auth/refresh',
          undefined,
          { headers: refreshHeaders },
        );
        const newToken = refreshResponse.data?.accessToken;

        if (!newToken) {
          throw new Error('Access token yangilanmadi');
        }

        if (refreshSuccessHandler) {
          refreshSuccessHandler(refreshResponse.data);
        }

        flushQueue(null, newToken);

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        const normalized = normalizeAxiosError(refreshError);
        flushQueue(normalized, null);
        if (authFailHandler) authFailHandler(normalized);
        throw normalized;
      } finally {
        isRefreshing = false;
      }
    },
  );
}

export function setupApiInterceptors({
  getAccessToken,
  onRefreshSuccess,
  onAuthFail,
}) {
  tokenGetter = getAccessToken || null;
  refreshSuccessHandler = onRefreshSuccess || null;
  authFailHandler = onAuthFail || null;

  attachInterceptors();

  return function cleanupInterceptors() {
    if (requestInterceptorId !== null) {
      api.interceptors.request.eject(requestInterceptorId);
      requestInterceptorId = null;
    }

    if (responseInterceptorId !== null) {
      api.interceptors.response.eject(responseInterceptorId);
      responseInterceptorId = null;
    }

    tokenGetter = null;
    refreshSuccessHandler = null;
    authFailHandler = null;
  };
}

export async function apiRequest({
  path,
  method = 'GET',
  body,
  query,
  isFormData = false,
  headers,
  signal,
}) {
  try {
    const finalHeaders = {
      ...(isFormData ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      'X-Lang': resolveLangHeaderValue(),
      'Accept-Language': resolveLangHeaderValue(),
      ...(headers || {}),
    };
    attachCsrfHeader(finalHeaders, method);

    const response = await api.request({
      url: path,
      method,
      params: query,
      data: body,
      headers: finalHeaders,
      signal,
    });

    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function apiDownload({
  path,
  method = 'GET',
  body,
  query,
  headers,
  signal,
}) {
  function parseFileName(contentDisposition) {
    if (!contentDisposition) return '';
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]).replace(/[/\\?%*:|"<>]/g, '_');
      } catch {
        return utf8Match[1];
      }
    }
    const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return simpleMatch?.[1] || '';
  }

  try {
    const response = await api.request({
      url: path,
      method,
      params: query,
      data: body,
      headers: {
        'X-Lang': resolveLangHeaderValue(),
        'Accept-Language': resolveLangHeaderValue(),
        ...(headers || {}),
      },
      signal,
      responseType: 'blob',
    });

    const contentDisposition = response.headers?.['content-disposition'] || '';
    const fileName = parseFileName(contentDisposition);

    return {
      blob: response.data,
      fileName: fileName || null,
      contentType: response.headers?.['content-type'] || 'application/octet-stream',
    };
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export { api };

export function getErrorMessage(error) {
  return error?.payload?.error?.message || error?.message || 'Noma`lum xatolik';
}
