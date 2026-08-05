import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in — Atomlet" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUserId()) redirect("/dashboard");
  const { error } = await searchParams;
  // Pass the raw OAuth error code; AuthForm maps it to a localized message.
  return (
    <AuthForm
      mode="login"
      oauthProviders={enabledProviders()}
      oauthErrorCode={error ?? null}
    />
  );
}
