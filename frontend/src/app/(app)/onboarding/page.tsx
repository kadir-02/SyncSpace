"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createWorkspace } from "@/store/slices/workspaceSlice";
import { logout } from "@/store/slices/authSlice";

export default function OnboardingPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const hasWorkspaces = useAppSelector((state) => state.workspaces.items.length > 0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const workspace = await dispatch(createWorkspace({ name: name.trim() })).unwrap();
      router.replace(`/w/${workspace.id}`);
    } catch (message) {
      setError(typeof message === "string" ? message : "Could not create workspace");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Create a workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          A workspace is where your company or group chats. You can add teams and channels next.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <Field label="Workspace name">
            <Input
              required
              minLength={2}
              maxLength={100}
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Inc."
            />
          </Field>

          <Button type="submit" loading={loading} className="w-full">
            Create workspace
          </Button>
        </form>

        {!hasWorkspaces && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Waiting for an invite?</p>
            <p className="mt-1">
              Ask a workspace admin to add you using your email
              {user ? (
                <>
                  {" "}
                  <span className="font-medium text-slate-800">({user.email})</span>
                </>
              ) : null}
              . Once they do, a link to the workspace appears on this page.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          {hasWorkspaces ? (
            <Link href="/" className="text-indigo-600 hover:underline">
              ← Back to workspace
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800"
            onClick={() => {
              dispatch(logout());
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
