import { Router } from "express";
import { createUser, getUserByEmail } from "../repositories/user.repository.js";

export const authRoutes = Router();

authRoutes.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }

    const user = await createUser({ email, password });
    
    req.session.user = {
      userId: user.id,
      email: user.email,
    };

    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

authRoutes.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await getUserByEmail(email);
    
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.user = {
      userId: user.id,
      email: user.email,
    };

    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

authRoutes.post("/logout", (req, res) => {
  req.session.user = undefined;
  res.json({ success: true });
});

authRoutes.get("/me", (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({ user: req.session.user });
});
