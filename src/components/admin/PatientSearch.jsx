"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import { PatientBadge } from "@/components/admin/ui";

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 220;

/* Live patient lookup.

   Three things this does that a ?q= page reload didn't:
   - results appear as you type, one keystroke behind at most, with no navigation
   - in-flight requests are aborted when you keep typing, so results can never
     arrive out of order and show stale matches
   - the term goes in a POST body, so patient names and phone numbers stay out
     of the URL bar, browser history, Referer headers and server access logs

   ↑/↓ moves through results, Enter opens, Esc closes. */
export default function PatientSearch({ autoFocus = false }) {
  const router = useRouter();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [state, setState] = useState({ rows: [], truncated: false, loading: false, searched: false });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState("");

  const boxRef = useRef(null);
  const abortRef = useRef(null);

  // Close when clicking outside the widget.
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const query = term.trim();

    if (query.length < MIN_LENGTH) {
      abortRef.current?.abort();
      setState({ rows: [], truncated: false, loading: false, searched: false });
      setError("");
      return undefined;
    }

    setState((s) => ({ ...s, loading: true }));

    const timer = setTimeout(async () => {
      // Supersede any request still in flight — the newest term always wins.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/admin/patients/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: query }),
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Search failed.");
          setState({ rows: [], truncated: false, loading: false, searched: true });
          return;
        }

        setError("");
        setState({
          rows: data.rows || [],
          truncated: Boolean(data.truncated),
          loading: false,
          searched: true,
        });
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if (err.name === "AbortError") return; // superseded, not a failure
        setError("Could not reach the server.");
        setState({ rows: [], truncated: false, loading: false, searched: true });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);

  function go(patient) {
    setOpen(false);
    router.push(`/admin/patients/${patient.slug || patient._id}`);
  }

  function onKeyDown(e) {
    if (!open || !state.rows.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % state.rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? state.rows.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(state.rows[active >= 0 ? active : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && term.trim().length >= MIN_LENGTH;

  return (
    <div className="adm-search" ref={boxRef}>
      <div className="adm-search-input">
        <span className="adm-search-ico" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => state.rows.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search patients by name, mobile or diagnosis…"
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {state.loading ? <span className="adm-search-status">searching…</span> : null}
        {term ? (
          <button
            type="button"
            className="adm-search-clear"
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="adm-search-panel" id={listId} role="listbox">
          {error ? (
            <p className="adm-search-empty" style={{ color: "var(--adm-red)" }}>
              {error}
            </p>
          ) : state.rows.length === 0 ? (
            <p className="adm-search-empty">
              {state.loading ? "Searching…" : `No patient matches “${term.trim()}”.`}
            </p>
          ) : (
            <>
              {state.rows.map((p, i) => (
                <button
                  type="button"
                  key={p._id}
                  role="option"
                  aria-selected={i === active}
                  className={`adm-search-row${i === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(p)}
                >
                  <span className="adm-search-row-main">
                    <strong>
                      <Highlight text={p.name} term={term.trim()} />
                    </strong>
                    <span className="adm-search-row-sub">
                      {formatPhone(p.phone)}
                      {p.age ? ` · ${p.age}y` : ""}
                      {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                    </span>
                  </span>
                  <span className="adm-search-row-meta">
                    <PatientBadge status={p.status} />
                    <span className="adm-small adm-mono">
                      {p.progress.completed}
                      {p.progress.planned > 0 ? `/${p.progress.planned}` : ""} done
                    </span>
                    {p.billing.due > 0 ? (
                      <span className="adm-small adm-mono" style={{ color: "var(--adm-red)" }}>
                        {formatMoney(p.billing.due)} due
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
              {state.truncated ? (
                <p className="adm-search-empty">
                  Showing the closest 20 matches — refine the search to narrow it.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* Marks the matched run inside a result so it's obvious why it matched. */
function Highlight({ text, term }) {
  const value = String(text || "");
  const at = value.toLowerCase().indexOf(term.toLowerCase());
  if (at === -1 || !term) return value;

  return (
    <>
      {value.slice(0, at)}
      <mark className="adm-mark">{value.slice(at, at + term.length)}</mark>
      {value.slice(at + term.length)}
    </>
  );
}
