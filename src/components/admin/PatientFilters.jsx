"use client";
import Link from "next/link";
import { PATIENT_STATUS_LABEL } from "@/lib/format";

/* View filters only — no search term. Status and "has dues" stay in the URL
   because they describe a view worth bookmarking and sharing with a colleague;
   a half-typed patient name is neither, which is why search lives in
   PatientSearch and posts its term instead. */
const DUES = [
  { key: "", label: "All" },
  { key: "due", label: "Has dues" },
  { key: "settled", label: "Fully paid" },
];

export default function PatientFilters({ status = "", dues = "" }) {
  const link = (patch) => {
    const merged = { status, dues, ...patch };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.dues) params.set("dues", merged.dues);
    return `/admin/patients${params.size ? `?${params}` : ""}`;
  };

  const chip = (isOn, href, label) => (
    <Link key={href + label} href={href} className={`adm-btn adm-btn-sm ${isOn ? "adm-btn-primary" : "adm-btn-ghost"}`}>
      {label}
    </Link>
  );

  return (
    <div className="adm-stack" style={{ gap: 10 }}>
      <div className="adm-inline">
        <span className="adm-filter-label">Case status</span>
        {chip(!status, link({ status: "" }), "All")}
        {Object.entries(PATIENT_STATUS_LABEL).map(([value, label]) =>
          chip(status === value, link({ status: value }), label)
        )}
      </div>

      <div className="adm-inline">
        <span className="adm-filter-label">Payment</span>
        {DUES.map((d) => chip(dues === d.key, link({ dues: d.key }), d.label))}
      </div>
    </div>
  );
}
