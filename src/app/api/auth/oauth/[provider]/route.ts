import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  buildAuthorizeUrl,
  enabledProviders,
  isOAuthProvider,
} from "@/lib/oauth";

export const runtime = "nodejs";

type Params = { params: Promise<{ provider: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { provider } = await params;
  if (!isOAuthProvider(provider) || !enabledProviders().includes(provider)) {
    return NextResponse.json({ error: "Unknown or disabled OAuth provider" }, { status: 404 });
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, req.nextUrl.origin).toString();

  const res = NextResponse.redirect(buildAuthorizeUrl(provider, redirectUri, state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
