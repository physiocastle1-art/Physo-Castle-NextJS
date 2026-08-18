"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="adm-btn adm-btn-ghost adm-btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await apiPost("/api/admin/auth/logout");
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
