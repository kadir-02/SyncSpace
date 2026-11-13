
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(
        data.message ||
        "If an account exists with this email, a reset link has been sent."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset link"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Forgot password?
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          No worries! Enter your email address and we&apos;ll send you
          instructions to reset your password.
        </p>
      </div>

      {message && (
        <p
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          role="status"
        >
          {message}
        </p>
      )}

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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </Field>

      <Button
        type="submit"
        loading={loading}
        className="w-full"
      >
        Send reset link
      </Button>

      <p className="text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-violet-600 hover:underline"
        >
          Back to login
        </Link>
      </p>
    </form>
  );
}
