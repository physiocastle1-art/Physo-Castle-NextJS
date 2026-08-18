"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Alert, Card, Empty, Field, Badge } from "./ui";
import { toShortcode, postUrlOf, IG_HANDLE, DEFAULT_POSTS } from "@/lib/instagram";
import { formatDate } from "@/lib/format";

/* Curating the homepage Instagram wall.

   Only the link is stored. The picture, caption and like count stay on
   Instagram and are pulled in by their embed script when the page renders —
   so a caption edited on the phone is edited on the website too, and no image
   is ever re-uploaded here. */

export default function InstagramManager({ rows = [], canDelete = false }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const live = rows.filter((r) => r.active);
  // The homepage renders eight; anything beyond that is queued behind them.
  const shown = live.slice(0, 8);
  const queued = live.length - shown.length;

  const preview = toShortcode(url);

  async function add(e) {
    e.preventDefault();
    setError("");

    if (!preview) {
      setFieldErrors({ url: "That doesn't look like an Instagram post link." });
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPost("/api/admin/instagram", { url, label });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setUrl("");
    setLabel("");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Card
        title="Add a post to the homepage wall"
        subtitle={`Open the post on Instagram, tap Share → Copy link, and paste it here.`}
      >
        <form className="adm-stack" onSubmit={add} noValidate>
          <Alert tone="error" message={error} />

          <div className="adm-form-grid">
            <Field
              label="Instagram post link *"
              span
              hint={
                preview
                  ? `Recognised post: ${preview}`
                  : "A post, reel or share link all work — extra tracking parameters are ignored."
              }
              error={fieldErrors.url}
            >
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFieldErrors({});
                }}
                placeholder={`https://www.instagram.com/p/${DEFAULT_POSTS[0]}/`}
              />
            </Field>
            <Field label="Note to self" hint="Optional — just so you can tell rows apart">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Knee exercise reel"
              />
            </Field>
          </div>

          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy || !preview}>
              {busy ? "Adding…" : "Add to wall"}
            </button>
            <a
              href={`https://www.instagram.com/${IG_HANDLE}/`}
              target="_blank"
              rel="noreferrer"
              className="adm-btn adm-btn-ghost"
            >
              Open @{IG_HANDLE}
            </a>
          </div>
        </form>
      </Card>

      <Card
        title={`Homepage wall (${shown.length} showing)`}
        subtitle={
          rows.length === 0
            ? "Nothing curated yet — the homepage is showing a built-in starter set."
            : queued > 0
              ? `The wall renders the first 8. ${queued} more are queued behind them — reorder or hide to change what appears.`
              : "These are the posts currently on the homepage, in order."
        }
        tight
      >
        {rows.length === 0 ? (
          <Empty
            icon="◎"
            title="No posts curated"
            hint="Until you add some, the homepage falls back to a built-in list so the section is never empty."
          />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="shrink">#</th>
                  <th>Post</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th className="shrink" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <PostRow
                    key={row._id}
                    row={row}
                    position={row.active ? live.indexOf(row) + 1 : null}
                    isFirst={i === 0}
                    isLast={i === rows.length - 1}
                    neighbours={rows}
                    index={i}
                    onWall={row.active && live.indexOf(row) < 8}
                    canDelete={canDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PostRow({ row, position, isFirst, isLast, neighbours, index, onWall, canDelete }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(values) {
    setBusy(true);
    setError("");
    const res = await apiPatch(`/api/admin/instagram/${row._id}`, values);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  /* Reordering swaps this row's order with its neighbour's rather than
     renumbering the whole list — one write each, and no chance of two rows
     ending up on the same number. */
  async function move(direction) {
    const other = neighbours[index + direction];
    if (!other) return;

    setBusy(true);
    setError("");
    const a = await apiPatch(`/api/admin/instagram/${row._id}`, { order: other.order });
    const b = await apiPatch(`/api/admin/instagram/${other._id}`, { order: row.order });
    setBusy(false);

    if (!a.ok || !b.ok) setError(a.error || b.error);
    else router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this post from the homepage wall?")) return;
    setBusy(true);
    const res = await apiDelete(`/api/admin/instagram/${row._id}`);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <tr style={row.active ? undefined : { opacity: 0.55 }}>
      <td className="adm-mono shrink">{position ?? "—"}</td>
      <td>
        <a
          href={postUrlOf(row.shortcode)}
          target="_blank"
          rel="noreferrer"
          className="adm-table-name adm-mono"
        >
          {row.shortcode}
        </a>
        {row.label ? <div className="adm-table-sub">{row.label}</div> : null}
        {error ? <div className="adm-table-sub" style={{ color: "var(--adm-red)" }}>{error}</div> : null}
      </td>
      <td className="adm-small adm-muted">{formatDate(row.createdAt)}</td>
      <td>
        {!row.active ? (
          <Badge tone="grey">Hidden</Badge>
        ) : onWall ? (
          <Badge tone="green">On the wall</Badge>
        ) : (
          <Badge tone="amber">Queued</Badge>
        )}
      </td>
      <td className="shrink">
        <div className="adm-row-actions">
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => move(-1)}
            disabled={busy || isFirst}
            title="Move earlier"
          >
            ↑
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => move(1)}
            disabled={busy || isLast}
            title="Move later"
          >
            ↓
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => patch({ active: !row.active })}
            disabled={busy}
          >
            {row.active ? "Hide" : "Show"}
          </button>
          {canDelete ? (
            <button
              type="button"
              className="adm-btn adm-btn-danger adm-btn-sm"
              onClick={remove}
              disabled={busy}
            >
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
