import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up — Atomlet" };

export default async function RegisterPage() {
  if (await getSessionUserId()) redirect("/dashboard");
  return <AuthForm mode="register" oauthProviders={enabledProviders()} />;
}
