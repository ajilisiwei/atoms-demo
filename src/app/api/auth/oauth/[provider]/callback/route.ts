import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import {
  OAUTH_STATE_COOKIE,
  enabledProviders,
  exchangeCodeForProfile,
  isOAuthProvider,
  type OAuthProvider,
} from "@/lib/oauth";

export const runtime = "nodejs";

type Params = { params: Promise<{ provider: string }> };

/** Redirect within the app, always clearing the one-shot state cookie. */
function redirectTo(req: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, req.nextUrl.origin));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

async function resolveUserId(
  provider: OAuthProvider,
  profile: { providerAccountId: string; email: string; name: string | null; avatarUrl: string | null },
): Promise<string> {
  const account = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
  });
  if (account) return account.userId;

  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existing) {
    // Same verified email — link this provider to the existing account.
    await prisma.oAuthAccount.create({
      data: { userId: existing.id, provider, providerAccountId: profile.providerAccountId },
    });
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      email: profile.email,
      passwordHash: null,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      oauthAccounts: {
        create: { provider, providerAccountId: profile.providerAccountId },
      },
      // Balance comes from the column default; the ledger row records the grant.
      creditLedger: { create: { delta: 1000, reason: "signup_grant" } },
    },
    select: { id: true },
  });
  return created.id;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { provider } = await params;
  try {
    if (!isOAuthProvider(provider) || !enabledProviders().includes(provider)) {
      return redirectTo(req, "/login?error=oauth");
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    if (!code || !state || !storedState || state !== storedState) {
      return redirectTo(req, "/login?error=oauth");
    }

    const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, req.nextUrl.origin).toString();
    const profile = await exchangeCodeForProfile(provider, code, redirectUri);
    if (!profile.email) return redirectTo(req, "/login?error=oauth_email");

    // Match the normalization used by password signup/login.
    const email = profile.email.trim().toLowerCase();
    const userId = await resolveUserId(provider, { ...profile, email });

    await createSession(userId);
    return redirectTo(req, "/dashboard");
  } catch (err) {
    console.error(`[oauth:${provider}] callback failed:`, err instanceof Error ? err.message : err);
    return redirectTo(req, "/login?error=oauth");
  }
}
