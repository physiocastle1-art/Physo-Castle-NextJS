import Link from "next/link";
import { requireUser } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/admin/SignOutButton";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", staff: "Staff" };

/* Every page under this layout is gated here — requireUser() re-reads the
   session and the user's current role from MongoDB on each request. Individual
   pages add their own minRole check where they need a higher bar. */
export default async function AdminAppLayout({ children }) {
  const user = await requireUser();

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand-mark">PC</span>
          <span className="adm-brand-text">
            <b>Physio Castle</b>
            <span>Clinic admin</span>
          </span>
        </Link>

        <AdminNav role={user.role} />

        <div className="adm-side-foot">
          <div className="adm-whoami">
            <b>{user.name}</b>
            <span>{user.email}</span>
            <span>{ROLE_LABEL[user.role] || user.role}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="adm-main">{children}</div>
    </div>
  );
}
