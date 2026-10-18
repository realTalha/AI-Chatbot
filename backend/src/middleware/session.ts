import type { Request, Response, NextFunction } from "express";
import "express-session";

export type SessionUser = {
  userId: string;
  email: string;
};

// Kept as an alias for backwards compatibility with existing imports.
export type { SessionUser as SessionData };

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}


export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
