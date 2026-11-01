import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelayMax: 5000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
};
