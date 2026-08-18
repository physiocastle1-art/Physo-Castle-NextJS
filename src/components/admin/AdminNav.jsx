"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAFF_MANAGEMENT_ENABLED } from "@/lib/features";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "▣" },
  { href: "/admin/patients", label: "Patients", icon: "☰" },
  { href: "/admin/schedule", label: "Schedule", icon: "◔" },
  { href: "/admin/recall", label: "Recall list", icon: "↺" },
  { href: "/admin/payments", label: "Payments", icon: "₹" },
  { href: "/admin/expenses", label: "Expenses & Profit", icon: "📊" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/admin/cms", label: "Reviews & CMS", icon: "💬" },
];

const ADMIN_ITEMS = [
  { href: "/admin/clinic", label: "Clinic setup", icon: "⌂" },
  ...(STAFF_MANAGEMENT_ENABLED
    ? [{ href: "/admin/staff", label: "Staff & access", icon: "◈", minRole: "admin" }]
    : []),
  { href: "/admin/settings", label: "My account", icon: "⚙" },
];

const RANK = { staff: 1, admin: 2, owner: 3 };

export default function AdminNav({ role }) {
  const pathname = usePathname();

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const render = (item) => (
    <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""}>
      <span className="adm-nav-ico">{item.icon}</span>
      {item.label}
    </Link>
  );

  return (
    <nav className="adm-nav">
      <span className="adm-nav-label">Clinic</span>
      {ITEMS.map(render)}
      <span className="adm-nav-label">Account</span>
      {ADMIN_ITEMS.filter((i) => !i.minRole || RANK[role] >= RANK[i.minRole]).map(render)}
    </nav>
  );
}
