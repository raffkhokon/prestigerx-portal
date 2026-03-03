type VSEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string } | null;
  message?: string;
};

type VSTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

function getConfig() {
  const baseUrl = process.env.VSDIGITAL_BASE_URL;
  const username = process.env.VSDIGITAL_USERNAME;
  const password = process.env.VSDIGITAL_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error('VSDigital credentials are not configured');
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), username, password };
}

async function vsRequest<T>(path: string, init: RequestInit): Promise<T> {
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
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse failures; handled below
  }

  if (!res.ok || (json && json.success === false)) {
    const message = json?.error?.message || json?.message || text || `HTTP ${res.status}`;
    throw new Error(`VSDigital API error (${path}): ${message}`);
  }

  if (json && 'data' in json) {
    return (json.data as T) ?? ({} as T);
  }

  return (json as unknown as T) ?? ({} as T);
}

async function login(): Promise<VSTokens> {
  const { username, password } = getConfig();
  return vsRequest<VSTokens>('/auth/partner/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const tokens = await login();
  const ttlMs = Math.max(((tokens.expiresIn ?? 3600) - 60), 60) * 1000;
  tokenCache = {
    accessToken: tokens.accessToken,
    expiresAt: Date.now() + ttlMs,
  };

  return tokens.accessToken;
}

export async function createVSDigitalOrder(payload: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  return vsRequest<Record<string, unknown>>('/order', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}
