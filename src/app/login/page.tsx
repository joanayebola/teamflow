import { Suspense } from "react";
import { AuthShell, LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Teamflow account.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
