"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      router.replace("/app");
    } catch (message) {
      setError(typeof message === "string" ? message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-violet-800">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to continue to your workspace.
        </p>
      </div>

      {error && (
        <p
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <div className="flex justify-end -mt-1">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-violet-600  hover:underline transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-slate-500">
        New to COHVRA?{" "}
        <Link
          href="/register"
          className="font-medium text-violet-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
