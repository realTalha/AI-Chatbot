"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout, User } from "@/lib/auth";
import SimpleChatPanel from "@/components/dashboard/SimpleChatPanel";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SimpleChatPanel onLogout={handleLogout} userEmail={user.email} />;
}

const styles = {
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontSize: "1rem",
    color: "#9ca3af",
    background: "linear-gradient(135deg, #0a0b0f 0%, #13151a 50%, #0a0b0f 100%)",
  },
};
