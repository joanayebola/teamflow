"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { AuthShell } from "@/components/auth-forms";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: { name, email, password } });
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) throw new Error("Account created, but sign-in failed. Try signing in.");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        const fieldMsg = err.fields ? Object.values(err.fields).flat()[0] : null;
        setError(fieldMsg ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start managing projects in minutes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <ErrorNote message={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-ink-400">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-300 hover:text-indigo-200">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
