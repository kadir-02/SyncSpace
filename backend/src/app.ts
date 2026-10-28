import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import teamRoutes from "./routes/team.routes.js";
import teamsRoutes from "./routes/teams.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import fileRoutes from "./routes/file.routes.js";
import dmRoutes from "./routes/dm.routes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is running",
    data: null,
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/workspaces", teamRoutes);
app.use("/api/v1/teams", teamsRoutes);
app.use("/api/v1/channels", channelRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/dms", dmRoutes);

app.use(errorMiddleware);

export default app;
