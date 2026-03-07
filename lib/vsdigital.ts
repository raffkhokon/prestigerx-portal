type VSEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string } | null;
  message?: string;
};

type VSTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
};

type VSRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

export type VSCatalogItem = {
  sku: string;
  ndc?: string;
  name: string;
  strength?: string;
  status?: string;
};

type VSState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

let tokenState: VSState | null = null;
let tokenPromise: Promise<string> | null = null;

export function getVSDigitalClientHealth() {
  const configured = Boolean(
    process.env.VSDIGITAL_USERNAME || process.env.VSDH_USERNAME
  ) && Boolean(process.env.VSDIGITAL_PASSWORD || process.env.VSDH_PASSWORD);

  const expiresAt = tokenState?.expiresAt ?? null;
  const msRemaining = expiresAt ? Math.max(expiresAt - Date.now(), 0) : null;

  return {
    configured,
    hasCachedToken: Boolean(tokenState?.accessToken),
    tokenExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    tokenMsRemaining: msRemaining,
  };
}

function getConfig() {
  const baseUrl =
    process.env.VSDIGITAL_BASE_URL ||
    process.env.VSDH_BASE_URL ||
    'https://sandbox-api.digitalpharmacy.vsdigitalhealth.com/api/v1';

  const username = process.env.VSDIGITAL_USERNAME || process.env.VSDH_USERNAME;
  const password = process.env.VSDIGITAL_PASSWORD || process.env.VSDH_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error('VSDigital credentials are not configured');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    username,
    password,
  };
}

async function rawRequest<T>(path: string, init: RequestInit): Promise<{ status: number; data: T }> {
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: VSEnvelope<T> | null = null;

  try {
    json = text ? (JSON.parse(text) as VSEnvelope<T>) : null;
  } catch {
    // swallow parse errors; surfaced below if needed
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.error?.message || json?.message || text || `HTTP ${res.status}`;
    throw new Error(`VSDigital API error (${path}): ${message}`);
  }

  const data = (json && 'data' in json ? (json.data as T) : (json as unknown as T)) ?? ({} as T);
  return { status: res.status, data };
}

async function login(): Promise<VSTokens> {
  const { username, password } = getConfig();
  const { data } = await rawRequest<VSTokens>('/auth/partner/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return data;
}

async function refresh(refreshToken: string): Promise<VSTokens> {
  const { data } = await rawRequest<VSTokens>('/auth/partner/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return data;
}

function hasValidAccessToken() {
  if (!tokenState) return false;
  return Date.now() < tokenState.expiresAt;
}

function setTokenState(tokens: VSTokens) {
  if (!tokens.accessToken) {
    throw new Error('VSDigital token response missing accessToken');
  }

  const expiresInSec = Math.max((tokens.expiresIn ?? 3600) - 60, 60); // 60s safety buffer
  tokenState = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || tokenState?.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

async function resolveAccessToken(): Promise<string> {
  if (hasValidAccessToken() && tokenState) {
    return tokenState.accessToken;
  }

  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    try {
      if (tokenState?.refreshToken) {
        try {
          const refreshed = await refresh(tokenState.refreshToken);
          setTokenState({ ...refreshed, refreshToken: refreshed.refreshToken || tokenState.refreshToken });
          return tokenState!.accessToken;
        } catch {
          // fall through to full login
        }
      }

      const tokens = await login();
      setTokenState(tokens);
      return tokenState!.accessToken;
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

async function request<T>(path: string, options: VSRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  if (options.auth !== false) {
    const accessToken = await resolveAccessToken();
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const { data } = await rawRequest<T>(path, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    return data;
  } catch (error) {
    const shouldRetry =
      options.auth !== false &&
      error instanceof Error &&
      /\(.*\):.*(Unauthorized|401)/i.test(error.message);

    if (!shouldRetry) throw error;

    const tokens = await login();
    setTokenState(tokens);

    const { data } = await rawRequest<T>(path, {
      method,
      headers: {
        ...headers,
        Authorization: `Bearer ${tokenState!.accessToken}`,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    return data;
  }
}

// --- Public helpers used by integration flow ---

export async function createVSDigitalOrder(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>('/order', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function createVSDigitalPatient(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>('/patient', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function getVSDigitalPatientByPartnerId(partnerPatientId: string) {
  return request<Record<string, unknown>>(`/patient/partner/${encodeURIComponent(partnerPatientId)}`, {
    method: 'GET',
    auth: true,
  });
}

export async function listVSDigitalCatalogItems(offset = 0, limit = 50) {
  const query = `?offset=${Math.max(0, offset)}&limit=${Math.min(100, Math.max(1, limit))}`;
  return request<{ count?: number; rows?: VSCatalogItem[]; pagination?: Record<string, unknown> }>(`/catalog/items${query}`, {
    method: 'GET',
    auth: true,
  });
}
