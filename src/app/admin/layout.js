import "./admin.css";

export const metadata = {
  title: "Admin — Physio Castle",
  // Keep the panel out of search results.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return <div className="adm">{children}</div>;
}
