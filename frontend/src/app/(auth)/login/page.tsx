"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { LucideEye, LucideEyeClosed } from "lucide-react";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passtype, setPasstype] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      router.replace("/");
    } catch (message) {
      setError(typeof message === "string" ? message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
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
        <div className="w-full relative ">
          <Input
            type={passtype ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setPasstype((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {passtype ? <LucideEyeClosed /> : <LucideEye />}
          </button>
        </div>
      </Field>
      <div className="flex justify-end -mt-1">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-slate-500">
        New to SyncSpace?{" "}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
