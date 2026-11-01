"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAppDispatch } from "@/store/hooks";
import {
  changePassword,
  logout,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from "@/store/slices/authSlice";
import { toastAdded } from "@/store/slices/uiSlice";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { me } = useWorkspace();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(me?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<"upload" | "remove" | null>(null);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!me) return null;

  const toast = (title: string, kind: "success" | "error" = "success") =>
    dispatch(toastAdded({ kind, title }));

  const onPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      toast("Use a JPG, PNG, WebP or GIF image", "error");
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast("Image is too large (max 2 MB)", "error");
      return;
    }

    setPhotoBusy("upload");

    try {
      await dispatch(uploadAvatar(file)).unwrap();
      toast("Profile photo updated");
    } catch (message) {
      toast(typeof message === "string" ? message : "Upload failed", "error");
    } finally {
      setPhotoBusy(null);
    }
  };

  const onRemovePhoto = async () => {
    setPhotoBusy("remove");

    try {
      await dispatch(removeAvatar()).unwrap();
      toast("Profile photo removed");
    } catch (message) {
      toast(typeof message === "string" ? message : "Could not remove photo", "error");
    } finally {
      setPhotoBusy(null);
    }
  };

  const onSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingName(true);

    try {
      await dispatch(updateProfile({ name: name.trim() })).unwrap();
      toast("Profile updated");
    } catch (message) {
      toast(typeof message === "string" ? message : "Could not update profile", "error");
    } finally {
      setSavingName(false);
    }
  };

  const onChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (passwords.next !== passwords.confirm) {
      setPasswordError("The new passwords don't match");
      return;
    }

    setSavingPassword(true);

    try {
      await dispatch(
        changePassword({ currentPassword: passwords.current, newPassword: passwords.next }),
      ).unwrap();
      setPasswords({ current: "", next: "", confirm: "" });
      toast("Password changed");
    } catch (message) {
      setPasswordError(typeof message === "string" ? message : "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const nameChanged = name.trim() !== me.name && name.trim().length >= 2;

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
          <p className="mt-1 text-sm text-slate-500">How you appear to everyone in your workspaces.</p>
        </header>

        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Photo</h2>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar id={me.id} name={me.name} src={me.avatar} size="xl" />
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_TYPES.join(",")}
                className="hidden"
                onChange={onPhoto}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  loading={photoBusy === "upload"}
                  disabled={photoBusy !== null}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> {me.avatar ? "Change photo" : "Upload photo"}
                </Button>
                {me.avatar && (
                  <Button
                    variant="ghost"
                    loading={photoBusy === "remove"}
                    disabled={photoBusy !== null}
                    onClick={onRemovePhoto}
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">JPG, PNG, WebP or GIF · up to 2 MB · cropped to a square</p>
            </div>
          </div>
        </section>

        <form onSubmit={onSaveName} className="space-y-4 rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Details</h2>
          <Field label="Full name">
            <Input required minLength={2} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Your email is used to sign in and can't be changed here.">
            <Input value={me.email} disabled readOnly />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={savingName} disabled={!nameChanged}>
              Save changes
            </Button>
          </div>
        </form>

        <form onSubmit={onChangePassword} className="space-y-4 rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Password</h2>
          {passwordError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {passwordError}
            </p>
          )}
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" hint="At least 6 characters">
              <Input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingPassword}>
              Update password
            </Button>
          </div>
        </form>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              dispatch(logout());
              router.replace("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
