// Server-only OAuth helpers for GitHub and Google.
// A provider is active only when both its client id and secret are present in
// the environment — with no env vars everything still compiles and the UI
// simply hides the buttons.

export type OAuthProvider = "github" | "google";

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
}

/** Cookie holding the CSRF `state` value between authorize and callback. */
export const OAUTH_STATE_COOKIE = "atoms_oauth_state";

const ALL_PROVIDERS: readonly OAuthProvider[] = ["github", "google"];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "github" || value === "google";
}

function getConfig(provider: OAuthProvider): ProviderConfig | null {
  const clientId =
    provider === "github" ? process.env.GITHUB_CLIENT_ID : process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    provider === "github" ? process.env.GITHUB_CLIENT_SECRET : process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function requireConfig(provider: OAuthProvider): ProviderConfig {
  const config = getConfig(provider);
  if (!config) throw new Error(`OAuth provider "${provider}" is not configured`);
  return config;
}

/** Providers whose client id AND secret are both set in the environment. */
export function enabledProviders(): OAuthProvider[] {
  return ALL_PROVIDERS.filter((provider) => getConfig(provider) !== null);
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
): string {
  const { clientId } = requireConfig(provider);
  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// --- Response parsing helpers (external data is untrusted) ------------------

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context}: unexpected response shape`);
  }
  return value as Record<string, unknown>;
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function fetchJson(input: string, init: RequestInit, context: string): Promise<unknown> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(`${context} failed (HTTP ${res.status})`);
  return res.json() as Promise<unknown>;
}

// --- GitHub -----------------------------------------------------------------

async function exchangeGithub(code: string, redirectUri: string): Promise<OAuthProfile> {
  const { clientId, clientSecret } = requireConfig("github");

  const tokenJson = await fetchJson(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    },
    "GitHub token exchange",
  );
  const accessToken = readString(asRecord(tokenJson, "GitHub token exchange"), "access_token");
  if (!accessToken) throw new Error("GitHub token response missing access_token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    // GitHub's API rejects requests without a User-Agent header.
    "User-Agent": "atoms-demo",
  };

  const userJson = asRecord(
    await fetchJson("https://api.github.com/user", { headers: authHeaders }, "GitHub user fetch"),
    "GitHub user fetch",
  );
  const id = userJson.id;
  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("GitHub user response missing id");
  }

  let email = readString(userJson, "email");
  if (!email) {
    // Public profile email can be hidden; fall back to the primary verified one.
    const emailsJson = await fetchJson(
      "https://api.github.com/user/emails",
      { headers: authHeaders },
      "GitHub emails fetch",
    );
    if (Array.isArray(emailsJson)) {
      const primary = emailsJson
        .map((entry) => asRecord(entry, "GitHub emails fetch"))
        .find((entry) => entry.primary === true && entry.verified === true);
      email = primary ? readString(primary, "email") : null;
    }
  }

  return {
    providerAccountId: String(id),
    email,
    name: readString(userJson, "name") ?? readString(userJson, "login"),
    avatarUrl: readString(userJson, "avatar_url"),
  };
}

// --- Google -----------------------------------------------------------------

async function exchangeGoogle(code: string, redirectUri: string): Promise<OAuthProfile> {
  const { clientId, clientSecret } = requireConfig("google");

  const tokenJson = await fetchJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
    "Google token exchange",
  );
  const accessToken = readString(asRecord(tokenJson, "Google token exchange"), "access_token");
  if (!accessToken) throw new Error("Google token response missing access_token");

  const info = asRecord(
    await fetchJson(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
      "Google userinfo fetch",
    ),
    "Google userinfo fetch",
  );
  const sub = readString(info, "sub");
  if (!sub) throw new Error("Google userinfo response missing sub");

  return {
    providerAccountId: sub,
    email: readString(info, "email"),
    name: readString(info, "name"),
    avatarUrl: readString(info, "picture"),
  };
}

export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile> {
  return provider === "github"
    ? exchangeGithub(code, redirectUri)
    : exchangeGoogle(code, redirectUri);
}
