"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  formatBytes,
  formatRelative,
  idOf,
  isImage,
  UPLOAD_ACCEPT,
  validateUpload,
} from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteFile, fetchFiles, uploadFile } from "@/store/slices/fileSlice";
import { toastAdded } from "@/store/slices/uiSlice";
import type { UploadedFile } from "@/types";

export default function FilesPage() {
  const dispatch = useAppDispatch();
  const { workspaceId, me } = useWorkspace();
  const entry = useAppSelector((state) => state.files.byWorkspace[workspaceId]);
  const uploading = useAppSelector((state) => Boolean(state.files.uploading[workspaceId]));
  const inputRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<UploadedFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchFiles({ workspaceId }));
  }, [workspaceId, dispatch]);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const problem = validateUpload(file);

    if (problem) {
      dispatch(toastAdded({ kind: "error", title: file.name, description: problem }));
      return;
    }

    try {
      await dispatch(uploadFile({ workspaceId, file })).unwrap();
      dispatch(toastAdded({ kind: "success", title: "File uploaded" }));
    } catch (message) {
      dispatch(
        toastAdded({ kind: "error", title: typeof message === "string" ? message : "Upload failed" }),
      );
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);

    try {
      await dispatch(deleteFile({ fileId: toDelete.id, workspaceId })).unwrap();
      dispatch(toastAdded({ kind: "success", title: "File deleted" }));
    } catch (message) {
      dispatch(
        toastAdded({ kind: "error", title: typeof message === "string" ? message : "Could not delete file" }),
      );
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const loading = !entry || entry.status === "loading" || entry.status === "idle";

  return (
    <div className="scroll-slim h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Files</h1>
            <p className="mt-1 text-sm text-slate-500">
              Shared files you have access to. Max 10 MB each.
            </p>
          </div>
          <div>
            <input ref={inputRef} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={onPick} />
            <Button onClick={() => inputRef.current?.click()} loading={uploading}>
              <Upload className="h-4 w-4" /> Upload file
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : entry.status === "error" ? (
          <EmptyState
            title="Could not load files"
            action={
              <Button variant="secondary" onClick={() => dispatch(fetchFiles({ workspaceId }))}>
                Try again
              </Button>
            }
          />
        ) : entry.items.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No files yet"
            description="Upload a file here, or attach one to a channel message."
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entry.items.map((file) => (
                <li key={file.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-36 items-center justify-center bg-slate-50"
                  >
                    {isImage(file.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt={file.originalName} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <FileText className="h-10 w-10 text-slate-400" />
                    )}
                  </a>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium text-slate-900" title={file.originalName}>
                      {file.originalName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {formatBytes(file.size)}
                      {typeof file.uploadedBy === "object" && ` · ${file.uploadedBy.name}`}
                      {file.createdAt && ` · ${formatRelative(file.createdAt)}`}
                    </p>
                    <div className="flex items-center gap-1 pt-1">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <Download className="h-4 w-4" /> Open
                      </a>
                      {idOf(file.uploadedBy) === me?.id && (
                        <Button variant="ghost" size="sm" onClick={() => setToDelete(file)} aria-label="Delete file">
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {entry.page < entry.totalPages && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  loading={entry.loadingMore}
                  onClick={() => dispatch(fetchFiles({ workspaceId, page: entry.page + 1 }))}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete file?"
        description={`“${toDelete?.originalName}” will be permanently removed.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
