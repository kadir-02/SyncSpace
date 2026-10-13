import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { initializeSocket } from "./config/socket.js";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const httpServer = createServer(app);

  initializeSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log("Socket.IO server initialized");
  });
};

startServer();
