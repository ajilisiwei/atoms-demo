import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up — Atomlet" };

export default async function RegisterPage() {
  if (await getSessionUserId()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
