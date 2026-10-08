import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import { getPool } from "./db/pool.js";
import { agentRoutes } from "./routes/agent.routes.js";
import { authRoutes } from "./routes/auth.routes.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const appOrigin = process.env.APP_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: appOrigin,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    },
  }),
);

app.get("/health", async (_req, res) => {
  try {
    await getPool().query("SELECT 1");
    res.json({ status: "ok", service: "ai-assistant-app", database: "up" });
  } catch {
    res.status(503).json({
      status: "error",
      service: "ai-assistant-app",
      database: "down",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/agent", agentRoutes);

app.listen(port, () => {
  console.log(`Genie AI App is running on port: ${port}`);
});
