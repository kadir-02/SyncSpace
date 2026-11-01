"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAppDispatch } from "@/store/hooks";
import { register } from "@/store/slices/authSlice";

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await dispatch(
        register({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
      ).unwrap();
      router.replace("/");
    } catch (message) {
      setError(typeof message === "string" ? message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Start a workspace or join your team.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <Field label="Full name">
        <Input
          required
          minLength={2}
          maxLength={50}
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          placeholder="Ada Lovelace"
        />
      </Field>

      <Field label="Email">
        <Input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password" hint="At least 6 characters">
        <Input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
