"use client";

import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { bindSocketEvents } from "@/store/socketHandlers";
import { socketStatusChanged } from "@/store/slices/uiSlice";
import { fetchWorkspaces } from "@/store/slices/workspaceSlice";
import { loadGlobalData } from "@/store/workspaceThunks";

/**
 * Owns the Socket.IO connection for the signed-in user, loads the data that
 * spans workspaces, and keeps the active chat's room joined.
 */
export function SocketBridge() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const token = useAppSelector((state) => state.auth.token);
  const connected = useAppSelector((state) => state.ui.socketConnected);
  const activeType = useAppSelector((state) => state.ui.activeChat?.type);
  const activeId = useAppSelector((state) => state.ui.activeChat?.id);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    const unbind = bindSocketEvents(socket, store);

    dispatch(fetchWorkspaces());
    dispatch(loadGlobalData());

    return () => {
      unbind();
      disconnectSocket();
      dispatch(socketStatusChanged(false));
    };
  }, [token, store, dispatch]);

  // Join the room of the chat being viewed (and re-join after reconnects).
  useEffect(() => {
    const socket = getSocket();

    if (!connected || !socket || !activeType || !activeId) return;

    if (activeType === "channel") {
      socket.emit("channel:join", { channelId: activeId });
      return () => {
        socket.emit("channel:leave", { channelId: activeId });
      };
    }

    socket.emit("dm:join", { conversationId: activeId });
    return () => {
      socket.emit("dm:leave", { conversationId: activeId });
    };
  }, [connected, activeType, activeId]);

  return null;
}
