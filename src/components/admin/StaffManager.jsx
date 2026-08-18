"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client";
import { Alert, Badge, Card, Field } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", staff: "Staff" };

export default function StaffManager({ staff, me }) {
  const router = useRouter();
  const isOwner = me.role === "owner";

  const [draft, setDraft] = useState({ name: "", email: "", role: "staff" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  async function invite(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDetails(null);
    setInviteUrl("");
    setNotice("");

    const res = await apiPost("/api/admin/staff", draft);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      setDetails(res.details);
      return;
    }

    setNotice(`Invite created for ${draft.email}.`);
    setDraft({ name: "", email: "", role: "staff" });
    if (res.data.inviteUrl) setInviteUrl(res.data.inviteUrl);
    router.refresh();
  }

  async function update(id, payload) {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await apiPatch(`/api/admin/staff/${id}`, payload);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function reinvite(id, email) {
    setBusy(true);
    setError("");
    setNotice("");
    setInviteUrl("");
    const res = await apiPost(`/api/admin/staff/${id}/reinvite`);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice(`A fresh invite link was generated for ${email}.`);
    if (res.data.inviteUrl) setInviteUrl(res.data.inviteUrl);
  }

  return (
    <>
      <Card
        title="Invite a colleague"
        subtitle="There is no public signup — this is the only way to create an account."
      >
        <form className="adm-stack" onSubmit={invite} noValidate>
          <Alert tone="error" message={error} details={details} />
          <Alert tone="ok" message={notice} />

          {inviteUrl ? (
            <Alert
              tone="info"
              message="Email isn't configured yet, so copy this link and send it to them yourself. It expires in 7 days."
              details={[inviteUrl]}
            />
          ) : null}

          <div className="adm-form-grid">
            <Field label="Name *">
              <input type="text" value={draft.name} onChange={set("name")} required />
            </Field>
            <Field label="Email *">
              <input type="email" value={draft.email} onChange={set("email")} required />
            </Field>
            <Field
              label="Role"
              hint={isOwner ? "Admins can delete records and invite staff." : "Only the owner can invite admins."}
            >
              <select value={draft.role} onChange={set("role")}>
                <option value="staff">Staff</option>
                {isOwner ? <option value="admin">Admin</option> : null}
              </select>
            </Field>
          </div>

          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
              {busy ? "Creating invite…" : "Send invite"}
            </button>
          </div>
        </form>
      </Card>

      <Card title={`${staff.length} account${staff.length === 1 ? "" : "s"}`} tight>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>State</th>
                <th>Last sign-in</th>
                <th className="shrink" />
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => {
                const isSelf = u._id === me.id;
                const canTouch = !isSelf && (isOwner || u.role !== "owner");

                return (
                  <tr key={u._id}>
                    <td>
                      <span className="adm-table-name">
                        {u.name}
                        {isSelf ? " (you)" : ""}
                      </span>
                      <div className="adm-table-sub">{u.email}</div>
                    </td>
                    <td>
                      {isOwner && !isSelf ? (
                        <select
                          value={u.role}
                          disabled={busy}
                          onChange={(e) => update(u._id, { role: e.target.value })}
                          style={{ maxWidth: 120 }}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <Badge tone={u.role === "owner" ? "green" : u.role === "admin" ? "blue" : "grey"}>
                          {ROLE_LABEL[u.role] || u.role}
                        </Badge>
                      )}
                    </td>
                    <td>
                      {u.disabledAt ? (
                        <Badge tone="red">Disabled</Badge>
                      ) : u.emailVerifiedAt ? (
                        <Badge tone="green">Active</Badge>
                      ) : (
                        <Badge tone="amber">Invite pending</Badge>
                      )}
                    </td>
                    <td className="adm-small adm-muted">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </td>
                    <td className="shrink">
                      <div className="adm-row-actions">
                        {!u.emailVerifiedAt && !u.disabledAt ? (
                          <button
                            type="button"
                            className="adm-btn adm-btn-ghost adm-btn-sm"
                            onClick={() => reinvite(u._id, u.email)}
                            disabled={busy}
                          >
                            Resend invite
                          </button>
                        ) : null}
                        {canTouch ? (
                          <button
                            type="button"
                            className={`adm-btn adm-btn-sm ${u.disabledAt ? "adm-btn-ghost" : "adm-btn-danger"}`}
                            onClick={() => update(u._id, { disabled: !u.disabledAt })}
                            disabled={busy}
                          >
                            {u.disabledAt ? "Re-enable" : "Disable"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
