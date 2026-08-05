import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in — Atomlet" };

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
