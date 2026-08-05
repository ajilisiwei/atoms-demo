import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in — Atomlet" };

const OAUTH_ERRORS: Record<string, string> = {
  oauth: "Social sign-in failed — please try again or use email",
  oauth_email: "Your social account has no verified email — use email sign-in instead",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUserId()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      oauthProviders={enabledProviders()}
      initialError={error ? (OAUTH_ERRORS[error] ?? null) : null}
    />
  );
}
