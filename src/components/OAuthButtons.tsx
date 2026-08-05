"use client";

interface OAuthButtonsProps {
  providers: string[];
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleMark() {
  // Official 4-color Google "G" — brand colors are required verbatim here.
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11C3.24 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

const PROVIDER_META = {
  github: { label: "GitHub", icon: <GitHubMark /> },
  google: { label: "Google", icon: <GoogleMark /> },
} as const;

type KnownProvider = keyof typeof PROVIDER_META;

function isKnownProvider(value: string): value is KnownProvider {
  return value in PROVIDER_META;
}

export function OAuthButtons({ providers }: OAuthButtonsProps) {
  const known = providers.filter(isKnownProvider);
  if (known.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-line flex-1" />
        <span className="text-xs text-muted">or continue with</span>
        <div className="h-px bg-line flex-1" />
      </div>
      <div className="flex flex-col gap-2">
        {known.map((provider) => (
          // Plain anchor: the target is a server route that 302s to the
          // provider, so client-side navigation must not intercept it.
          <a
            key={provider}
            href={`/api/auth/oauth/${provider}`}
            className="w-full rounded-lg border border-line py-2.5 text-sm font-medium hover:bg-panel-2 transition-colors flex items-center justify-center gap-2"
          >
            {PROVIDER_META[provider].icon}
            Continue with {PROVIDER_META[provider].label}
          </a>
        ))}
      </div>
    </div>
  );
}
