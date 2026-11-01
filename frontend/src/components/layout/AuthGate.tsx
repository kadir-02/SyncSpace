"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUnauthorizedHandler } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { bootstrapSession, logout } from "@/store/slices/authSlice";
import { FullScreenSpinner } from "@/components/ui/Spinner";

/** Restores the session on load and blocks rendering until the user is known. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status === "idle") dispatch(bootstrapSession());
  }, [status, dispatch]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Any 401 from the API means the token expired or was revoked.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logout());
      router.replace("/login");
    });

    return () => setUnauthorizedHandler(null);
  }, [dispatch, router]);

  if (status !== "authenticated") return <FullScreenSpinner label="Loading your session…" />;

  return <>{children}</>;
}
