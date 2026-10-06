import type { Request, Response, NextFunction } from "express";

export type SessionData = {
  userId: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      session: {
        user?: SessionData;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
