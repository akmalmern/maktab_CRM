import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const REFRESH_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

function normalizeAxiosError(error) {
  if (error?.isNormalizedApiError) return error;

  const message =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Noma`lum xatolik';

  const normalized = new Error(message);
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

function attachInterceptors() {
  if (requestInterceptorId !== null) {
    api.interceptors.request.eject(requestInterceptorId);
  }

  if (responseInterceptorId !== null) {
    api.interceptors.response.eject(responseInterceptorId);
  }

  requestInterceptorId = api.interceptors.request.use((config) => {
    const token = tokenGetter ? tokenGetter() : null;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  responseInterceptorId = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config || {};
      const status = error?.response?.status;
      const url = original?.url || '';

      if (status !== 401 || original._retry || shouldSkipRefresh(url)) {
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
        const refreshResponse = await refreshClient.post('/api/auth/refresh');
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
  };
}

export async function apiRequest({
  path,
  method = 'GET',
  body,
  query,
  isFormData = false,
  headers,
  token,
  signal,
}) {
  try {
    const finalHeaders = {
      ...(isFormData ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    };

    if (token && !finalHeaders.Authorization) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

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

export { api };

export function getErrorMessage(error) {
  return error?.payload?.error?.message || error?.message || 'Noma`lum xatolik';
}
