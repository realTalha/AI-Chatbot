"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx>{`
        .auth-button:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(124, 58, 237, 0.6);
          filter: brightness(1.15);
        }
      `}</style>
      <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Genie AI</h1>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
              placeholder="Your username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={styles.passwordInput}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </button>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.passwordContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={styles.passwordInput}
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button} className="auth-button">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <a href="/" style={styles.link}>
            Sign In
          </a>
        </p>
      </div>
    </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a0b0f 0%, #13151a 50%, #0a0b0f 100%)",
    padding: "1rem",
    position: "relative" as const,
    overflowY: "auto" as const,
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(91, 33, 182, 0.05) 100%)",
    padding: "1.25rem",
    borderRadius: "16px",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 0 40px rgba(124, 58, 237, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)",
    position: "relative" as const,
    zIndex: 1,
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    textAlign: "center" as const,
    marginBottom: "0.125rem",
    background: "linear-gradient(135deg, #c4b5fd 0%, #7c3aed 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    textAlign: "center" as const,
    color: "#9ca3af",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#e8eaed",
  },
  input: {
    padding: "0.625rem",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    backgroundColor: "rgba(19, 21, 26, 0.8)",
    color: "#e8eaed",
    transition: "all 0.2s ease",
  },
  passwordContainer: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  passwordInput: {
    padding: "0.625rem",
    paddingRight: "2.75rem",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
    backgroundColor: "rgba(19, 21, 26, 0.8)",
    color: "#e8eaed",
    transition: "all 0.2s ease",
  },
  eyeButton: {
    position: "absolute" as const,
    right: "0.625rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    transition: "color 0.2s ease",
  },
  button: {
    padding: "0.625rem",
    background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "0.125rem",
    transition: "all 0.2s ease",
    boxShadow: "0 0 20px rgba(124, 58, 237, 0.3)",
  },
  error: {
    padding: "0.5rem",
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    color: "#fca5a5",
    borderRadius: "8px",
    fontSize: "0.8rem",
    border: "1px solid rgba(220, 38, 38, 0.3)",
  },
  footer: {
    marginTop: "0.75rem",
    textAlign: "center" as const,
    fontSize: "0.8rem",
    color: "#9ca3af",
  },
  link: {
    color: "#a78bfa",
    textDecoration: "underline",
    fontWeight: "500",
    transition: "color 0.2s ease",
  },
};
