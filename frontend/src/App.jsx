import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./styles.css";

const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:4000";
const TOKEN_KEY = "civicfix-token";

const workflowStatuses = [
  { value: "submitted", label: "Submitted", tone: "slate" },
  { value: "in_review", label: "In review", tone: "amber" },
  { value: "assigned", label: "Assigned", tone: "indigo" },
  { value: "resolved", label: "Resolved", tone: "emerald" }
];

const statusMeta = workflowStatuses.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

function labelFor(status) {
  return statusMeta[status]?.label ?? status ?? "—";
}
function toneFor(status) {
  return statusMeta[status]?.tone ?? "slate";
}

/* ============================================================
   hooks
   ============================================================ */

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? "0px 0px -8% 0px"
      }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);
  return { ref, inView };
}

function useCountUp(value, { duration = 900, active = true } = {}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (!active || reduced || typeof requestAnimationFrame === "undefined") {
      setDisplay(target);
      return;
    }
    let frame;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active, reduced, duration]);
  return display;
}

function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") || "light"
      : "light"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("civicfix-theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  const toggle = () => setTheme((current) => (current === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const seed = useRef(0);
  const notify = (text, kind = "info") => {
    if (!text) return;
    seed.current += 1;
    const id = seed.current;
    setToasts((current) => [...current, { id, kind, text }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  };
  const dismiss = (id) => setToasts((current) => current.filter((t) => t.id !== id));
  return { toasts, notify, dismiss };
}

function useAuth() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => {
        if (!cancelled) setUser(payload.data);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const persist = useCallback((nextToken, nextUser) => {
    try {
      if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => persist(null, null), [persist]);

  return { token, user, authLoading, setUser, persist, logout };
}

/* ============================================================
   small components
   ============================================================ */

function Reveal({ as: Tag = "div", className = "", delay = 0, children, ...rest }) {
  const { ref, inView } = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-revealed" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function Icon({ name, className = "" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className: `icon ${className}`.trim()
  };
  switch (name) {
    case "report":
      return (
        <svg {...common}>
          <path d="M12 3 2 20h20L12 3z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5" />
          <path d="M17.5 20a5.5 5.5 0 0 1-3-5" />
        </svg>
      );
    case "ops":
      return (
        <svg {...common}>
          <path d="M5 6h10" />
          <path d="M5 12h14" />
          <path d="M5 18h7" />
          <circle cx="18" cy="6" r="2.4" />
          <circle cx="15" cy="18" r="2.4" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 1.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="m21 16-4.5-4.5L7 19" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M15 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
          <path d="M18 8l4 4-4 4" />
          <path d="M22 12H10" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function StatusBadge({ status }) {
  return (
    <span className={`badge tone-${toneFor(status)}`}>
      <span className="badge-dot" />
      {labelFor(status)}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

function CountUp({ value }) {
  const reduced = useReducedMotion();
  const count = useCountUp(value, { active: true });
  return <strong className="metric-value mono">{reduced ? value : count}</strong>;
}

function ToastTray({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-tray" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span className="toast-icon">
            <Icon name={toast.kind === "success" ? "check" : toast.kind === "error" ? "report" : "clock"} />
          </span>
          <span className="toast-text">{toast.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   app
   ============================================================ */

export default function App() {
  const { theme, toggle } = useTheme();
  const { toasts, notify, dismiss } = useToasts();
  const { token, user, authLoading, persist, logout } = useAuth();

  const [apiStatus, setApiStatus] = useState("checking");
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [authModal, setAuthModal] = useState(null); // 'login' | 'signup' | null
  const [view, setView] = useState("dashboard");
  const [lightbox, setLightbox] = useState(null);

  const [formState, setFormState] = useState({
    title: "",
    description: "",
    categoryId: "",
    address: "",
    imageUrl: null
  });

  const api = useCallback(
    async (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (options.body && typeof options.body === "string") {
        headers["Content-Type"] = "application/json";
      }
      const res = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
      if (res.status === 401 && token) logout();
      return res;
    },
    [token, logout]
  );

  useEffect(() => {
    async function load() {
      try {
        const [health, issuesRes, metricsRes, catRes] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/api/issues`),
          fetch(`${apiBaseUrl}/api/metrics/summary`),
          fetch(`${apiBaseUrl}/api/categories`)
        ]);
        if (!health.ok) throw new Error("health failed");
        setApiStatus("connected");
        setCategories((await catRes.json()).data ?? []);
        setIssues((await issuesRes.json()).data ?? []);
        setMetrics((await metricsRes.json()).data ?? null);
      } catch {
        setApiStatus("unavailable");
      }
    }
    load();
  }, []);

  const loadTeams = useCallback(async () => {
    if (!token || user?.role !== "admin") return;
    try {
      const res = await api("/api/teams");
      if (res.ok) setTeams((await res.json()).data ?? []);
    } catch {
      /* ignore */
    }
  }, [token, user, api]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);

  const filteredIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (statusFilter !== "all" && issue.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [issue.title, issue.description, issue.category, issue.address, issue.assigned_team]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [issues, query, statusFilter]);

  const myIssues = useMemo(
    () => issues.filter((issue) => issue.reported_by === user?.id),
    [issues, user]
  );

  const resolvedCount = useMemo(() => {
    const row = metrics?.byStatus?.find((item) => item.status === "resolved");
    return row?.count ?? 0;
  }, [metrics]);
  const totalIssues = metrics?.totalIssues ?? 0;
  const resolvedPct = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;
  const openCount = useMemo(
    () => (metrics?.byStatus ?? []).filter((s) => s.status !== "resolved").reduce((a, b) => a + b.count, 0),
    [metrics]
  );
  const statusMax = useMemo(() => {
    if (!metrics?.byStatus) return 1;
    return Math.max(1, ...metrics.byStatus.map((i) => i.count));
  }, [metrics]);

  function updateFormField(event) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(file);
    });
  }

  async function onImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setFormState((current) => ({ ...current, imageUrl: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.", "error");
      return;
    }
    if (file.size > 2 * 1000 * 1000) {
      notify("Image is too large (max 2MB).", "error");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormState((current) => ({ ...current, imageUrl: dataUrl }));
    } catch {
      notify("Could not load that image.", "error");
    }
  }

  async function refreshMetrics() {
    const res = await fetch(`${apiBaseUrl}/api/metrics/summary`);
    if (!res.ok) throw new Error("metrics failed");
    setMetrics((await res.json()).data ?? null);
  }

  function removeImage() {
    setFormState((current) => ({ ...current, imageUrl: null }));
  }

  async function submitIssue(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await api("/api/issues", {
        method: "POST",
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          categoryId: Number(formState.categoryId),
          address: formState.address,
          imageUrl: formState.imageUrl
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message ?? "Could not submit issue");
      setIssues((current) => [
        { ...payload.data, assigned_team: payload.data.assigned_team ?? null },
        ...current
      ]);
      await refreshMetrics();
      setFormState({ title: "", description: "", categoryId: "", address: "", imageUrl: null });
      notify("Issue report submitted. Our team will review it.", "success");
      setView(user?.role === "admin" ? "reports" : "my-reports");
    } catch (error) {
      notify(error.message ?? "Could not submit issue", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshIssueHistory(issueId) {
    const res = await fetch(`${apiBaseUrl}/api/issues/${issueId}/history`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.message ?? "history failed");
    setHistory(payload.data ?? []);
  }

  async function selectIssue(issue, target) {
    setSelectedIssueId(issue.id);
    setBusy(false);
    try {
      await refreshIssueHistory(issue.id);
    } catch (error) {
      notify(error.message, "error");
    }
    if (target) {
      setView(target);
      setTimeout(
        () => document.getElementById("operations")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        40
      );
    }
  }

  async function updateIssueStatus(nextStatus) {
    if (!selectedIssue) return;
    setBusy(true);
    try {
      const res = await api(`/api/issues/${selectedIssue.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, note: statusNote })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message ?? "Could not update status");
      setIssues((current) =>
        current.map((issue) => (issue.id === selectedIssue.id ? { ...issue, ...payload.data } : issue))
      );
      setStatusNote("");
      await refreshIssueHistory(selectedIssue.id);
      await refreshMetrics();
      notify(`Status updated to ${labelFor(nextStatus)}.`, "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function assignIssueToTeam(event) {
    if (!selectedIssue) return;
    const teamId = Number(event.target.value);
    if (!teamId) return;
    setBusy(true);
    try {
      const res = await api(`/api/issues/${selectedIssue.id}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({ teamId })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message ?? "Could not assign report");
      setIssues((current) =>
        current.map((issue) => (issue.id === selectedIssue.id ? { ...issue, ...payload.data } : issue))
      );
      await refreshIssueHistory(selectedIssue.id);
      await refreshMetrics();
      notify("Report assigned to team.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthSubmit(kind, fields) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields)
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message ?? "Authentication failed");
      persist(payload.data.token, payload.data.user);
      setAuthModal(null);
      setView("dashboard");
      notify(kind === "signup" ? `Welcome, ${payload.data.user.fullName}.` : `Welcome back, ${payload.data.user.fullName}.`, "success");
    } catch (error) {
      notify(error.message, "error");
      throw error;
    }
  }

  const loading = apiStatus === "checking";
  const isAdmin = user?.role === "admin";

  return (
    <main className="page">
      <Nav
        theme={theme}
        themeToggle={toggle}
        apiStatus={apiStatus}
        user={user}
        view={view}
        setView={setView}
        onLogin={() => setAuthModal("login")}
        onSignup={() => setAuthModal("signup")}
        onLogout={() => {
          logout();
          setView("dashboard");
          setAuthModal(null);
          notify("Signed out.", "info");
        }}
      />

      <ToastTray toasts={toasts} dismiss={dismiss} />

      {!user ? (
        <Landing
          loading={loading}
          metrics={metrics}
          issues={issues}
          categories={categories}
          onSignup={() => setAuthModal("signup")}
          onLogin={() => setAuthModal("login")}
          setLightbox={setLightbox}
        />
      ) : isAdmin ? (
        <AdminApp
          loading={loading}
          metrics={metrics}
          issues={filteredIssues}
          allIssues={issues}
          categories={categories}
          teams={teams}
          view={view}
          setView={setView}
          selectedIssue={selectedIssue}
          selectedIssueId={selectedIssueId}
          setSelectedIssueId={setSelectedIssueId}
          selectIssue={selectIssue}
          history={history}
          statusNote={statusNote}
          setStatusNote={setStatusNote}
          busy={busy}
          assignIssueToTeam={assignIssueToTeam}
          updateIssueStatus={updateIssueStatus}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          resolvedCount={resolvedCount}
          totalIssues={totalIssues}
          resolvedPct={resolvedPct}
          openCount={openCount}
          statusMax={statusMax}
          setLightbox={setLightbox}
          user={user}
        />
      ) : (
        <ResidentApp
          loading={loading}
          metrics={metrics}
          issues={issues}
          myIssues={myIssues}
          categories={categories}
          view={view}
          setView={setView}
          formState={formState}
          updateFormField={updateFormField}
          onImageChange={onImageChange}
          onImageRemove={removeImage}
          submitIssue={submitIssue}
          submitting={submitting}
          apiStatus={apiStatus}
          resolvedCount={resolvedCount}
          totalIssues={totalIssues}
          resolvedPct={resolvedPct}
          statusMax={statusMax}
          setLightbox={setLightbox}
        />
      )}

      {authModal ? (
        <AuthModal
          mode={authModal}
          setMode={setAuthModal}
          onClose={() => setAuthModal(null)}
          onSubmit={handleAuthSubmit}
        />
      ) : null}

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="lightbox-close" aria-label="Close image" onClick={() => setLightbox(null)}>
            <Icon name="close" />
          </button>
          <img src={lightbox} alt="Report evidence" />
        </div>
      ) : null}

      {authLoading ? <div className="auth-veil" aria-hidden="true" /> : null}
    </main>
  );
}

/* ============================================================
   nav
   ============================================================ */

function Nav({ theme, themeToggle, apiStatus, user, view, setView, onLogin, onSignup, onLogout }) {
  const isAdmin = user?.role === "admin";
  const links = !user
    ? []
    : isAdmin
      ? [
          { key: "dashboard", label: "Dashboard", icon: "grid" },
          { key: "reports", label: "Reports", icon: "list" },
          { key: "operations", label: "Operations", icon: "ops" },
          { key: "teams", label: "Teams", icon: "team" }
        ]
      : [
          { key: "dashboard", label: "Community", icon: "grid" },
          { key: "report", label: "Report issue", icon: "plus" },
          { key: "my-reports", label: "My reports", icon: "list" }
        ];

  return (
    <nav className="nav" aria-label="Primary">
      <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); setView("dashboard"); }}>
        <span className="brand-mark" aria-hidden="true">
          <Icon name="report" />
        </span>
        <span className="brand-name">
          Civic<span className="accent">Fix</span>
        </span>
        {isAdmin ? <span className="nav-tag">Admin</span> : null}
      </a>

      {user ? (
        <div className="nav-links">
          {links.map((link) => (
            <button
              key={link.key}
              className={`nav-link ${view === link.key ? "nav-link-active" : ""}`}
              onClick={() => setView(link.key)}
            >
              <Icon name={link.icon} /> {link.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="nav-actions">
        <span className={`nav-status status-${apiStatus}`} title={`Backend API: ${apiStatus}`}>
          <span className="nav-status-dot" />
          <span className="nav-status-text">{apiStatus}</span>
        </span>
        <button
          type="button"
          className="theme-toggle"
          onClick={themeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        {user ? (
          <div className="nav-user">
            <span className="nav-user-name" title={user.email}>
              <Icon name="user" /> {user.fullName}
            </span>
            <button className="btn btn-sm btn-secondary" onClick={onLogout}>
              <Icon name="logout" /> Sign out
            </button>
          </div>
        ) : (
          <div className="nav-auth">
            <button className="btn btn-sm btn-ghost-light" onClick={onLogin}>Log in</button>
            <button className="btn btn-sm btn-primary" onClick={onSignup}>Sign up</button>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ============================================================
   landing (logged out)
   ============================================================ */

function Landing({ loading, metrics, issues, categories, onSignup, onLogin, setLightbox }) {
  const totalIssues = metrics?.totalIssues ?? 0;
  const resolvedCount = metrics?.byStatus?.find((s) => s.status === "resolved")?.count ?? 0;
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow">CubIC ClouD · Civic technology</p>
          <h1 id="hero-title">
            Report it. <span className="accent">Track it.</span> Get it fixed.
          </h1>
          <p className="hero-copy">
            CivicFix connects residents with the teams that maintain their
            neighborhoods. Photograph a problem, file a report, and follow it
            all the way to resolution — transparent, accountable, and fast.
          </p>
          <div className="hero-row">
            <span className="status-pill status-connected">
              <span className="status-pill-dot" /> {loading ? "Connecting…" : "Live community board"}
            </span>
            {!loading && metrics ? (
              <span className="hero-quick">
                <strong className="mono">{totalIssues}</strong> reports
                <span className="dot-sep" />
                <strong className="mono">{resolvedCount}</strong> resolved
              </span>
            ) : null}
          </div>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={onSignup}>
              <Icon name="plus" /> Create an account
            </button>
            <button className="btn btn-ghost" onClick={onLogin}>
              <Icon name="user" /> Log in
            </button>
          </div>
          <p className="hero-hint">
            Demo admin · <span className="mono">admin@civicfix.local</span> / <span className="mono">admin123</span>
          </p>
        </div>
      </section>

      <section className="block" aria-label="Who it is for">
        <div className="card-grid">
          {[
            { icon: "report", title: "For residents", body: "Photograph a pothole, broken light, or unsafe sidewalk, file a report in seconds, and watch it move through the repair workflow to resolution." },
            { icon: "team", title: "For municipal teams", body: "Receive verified reports, triage and assign work to the right crew, update status, and keep a transparent audit trail for every issue." },
            { icon: "user", title: "For administrators", body: "An operations dashboard to oversee every report, balance team workload, and monitor resolution rates across the whole district." }
          ].map((card, index) => (
            <Reveal as="article" className="card feature-card" key={card.title} delay={index * 90}>
              <span className="feature-icon">
                <Icon name={card.icon} />
              </span>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="block" aria-label="AI verification feature">
        <Reveal className="card ai-feature">
          <div className="ai-feature-glow" aria-hidden="true" />
          <div className="ai-feature-head">
            <span className="ai-badge">
              <Icon name="spark" /> Coming soon
            </span>
            <h2>AI evidence verification</h2>
            <p className="ai-lead">
              When you upload a photo with your report, CivicFix's AI will
              compare the image against your written description to confirm the
              issue is genuine — then automatically route verified reports
              straight to the responsible municipal team.
            </p>
          </div>
          <ol className="ai-steps">
            <li>
              <span className="ai-step-num">1</span>
              <div>
                <strong>Resident uploads a photo</strong>
                <p>A picture of the pothole, broken light, or hazard is attached to the report.</p>
              </div>
            </li>
            <li>
              <span className="ai-step-num">2</span>
              <div>
                <strong>AI matches image to description</strong>
                <p>Our model checks whether the photo actually shows what the report describes — filtering out false or mistaken reports before they reach a team.</p>
              </div>
            </li>
            <li>
              <span className="ai-step-num">3</span>
              <div>
                <strong>Verified reports are sent to admin</strong>
                <p>Genuine, verified issues are auto-routed to the right municipal crew so real problems get fixed faster, and teams waste less time on bad reports.</p>
              </div>
            </li>
          </ol>
          <p className="ai-foot muted">
            This feature is planned for a later phase — it is described here so
            you know where CivicFix is heading. The upload interface is already
            in place; AI verification will plug into it next.
          </p>
        </Reveal>
      </section>

      <section className="block" aria-label="Recent community reports">
        <Reveal className="card">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Community board</p>
              <h2>Recent reports</h2>
            </div>
            <button className="btn btn-sm btn-primary" onClick={onSignup}>
              <Icon name="plus" /> Report your issue
            </button>
          </header>
          {loading ? (
            <ul className="issue-list">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="issue-skeleton" />
              ))}
            </ul>
          ) : issues.length > 0 ? (
            <ul className="issue-list">
              {issues.slice(0, 6).map((issue) => (
                <IssueCard key={issue.id} issue={issue} setLightbox={setLightbox} />
              ))}
            </ul>
          ) : (
            <p className="muted empty">No reports yet.</p>
          )}
        </Reveal>
      </section>

      {categories.length > 0 ? (
        <section className="block">
          <Reveal className="card">
            <header className="panel-head">
              <div>
                <p className="eyebrow tone-eyebrow">Reference data</p>
                <h2>Issue categories</h2>
              </div>
            </header>
            <ul className="category-list">
              {categories.map((category, index) => (
                <Reveal as="li" key={category.id} delay={index * 50}>
                  <strong>{category.name}</strong>
                  <span>{category.description}</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </section>
      ) : null}
    </>
  );
}

/* ============================================================
   auth modal
   ============================================================ */

function AuthModal({ mode, setMode, onClose, onSubmit }) {
  const [fields, setFields] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useId();
  const isSignup = mode === "signup";

  function update(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = isSignup
        ? { fullName: fields.fullName, email: fields.email, password: fields.password }
        : { email: fields.email, password: fields.password };
      await onSubmit(mode, payload);
    } catch (err) {
      setError(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={heading}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <header className="modal-head">
          <p className="eyebrow tone-eyebrow">{isSignup ? "Join CivicFix" : "Welcome back"}</p>
          <h2 id={heading}>{isSignup ? "Create your account" : "Log in to CivicFix"}</h2>
          <p className="muted">
            {isSignup
              ? "Report issues and track them to resolution."
              : "Pick up where you left off."}
          </p>
        </header>

        <form className="auth-form" onSubmit={submit}>
          {isSignup ? (
            <label className="field">
              <span className="field-label"><Icon name="user" /> Full name</span>
              <input
                name="fullName"
                value={fields.fullName}
                onChange={update}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </label>
          ) : null}
          <label className="field">
            <span className="field-label"><Icon name="pin" /> Email</span>
            <input
              type="email"
              name="email"
              value={fields.email}
              onChange={update}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span className="field-label"><Icon name="shield" /> Password</span>
            <input
              type="password"
              name="password"
              value={fields.password}
              onChange={update}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignup ? "Already have an account?" : "New to CivicFix?"}{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setError("");
              setMode(isSignup ? "login" : "signup");
            }}
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>

        {!isSignup ? (
          <p className="modal-hint muted">
            Demo admin · <span className="mono">admin@civicfix.local</span> / <span className="mono">admin123</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   resident app
   ============================================================ */

function ResidentApp(props) {
  const {
    loading, metrics, issues, myIssues, categories, view, setView,
    formState, updateFormField, onImageChange, onImageRemove, submitIssue, submitting,
    apiStatus, resolvedCount, totalIssues, resolvedPct, statusMax, setLightbox
  } = props;

  if (view === "report") {
    return (
      <section id="report" className="block">
        <Reveal className="card issue-form">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Resident</p>
              <h2>Report a local issue</h2>
              <p className="panel-sub">
                Add a photo so our team (and soon, our AI) can verify the issue quickly.
              </p>
            </div>
          </header>
          <ReportForm
            formState={formState}
            updateFormField={updateFormField}
            onImageChange={onImageChange}
            onImageRemove={onImageRemove}
            submitIssue={submitIssue}
            submitting={submitting}
            categories={categories}
          />
        </Reveal>
      </section>
    );
  }

  if (view === "my-reports") {
    return (
      <section className="block">
        <Reveal className="card">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">My reports</p>
              <h2>Reports you filed</h2>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setView("report")}>
              <Icon name="plus" /> New report
            </button>
          </header>
          {myIssues.length > 0 ? (
            <ul className="issue-list">
              {myIssues.map((issue) => (
                <li key={issue.id} className="issue-item">
                  <IssueBody issue={issue} setLightbox={setLightbox} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p className="muted">You have not filed any reports yet.</p>
              <button className="btn btn-primary" onClick={() => setView("report")}>
                <Icon name="plus" /> Report your first issue
              </button>
            </div>
          )}
        </Reveal>
      </section>
    );
  }

  return (
    <Dashboard
      loading={loading}
      metrics={metrics}
      issues={issues}
      categories={categories}
      resolvedCount={resolvedCount}
      totalIssues={totalIssues}
      resolvedPct={resolvedPct}
      statusMax={statusMax}
      setLightbox={setLightbox}
      onReport={() => setView("report")}
    />
  );
}

function ReportForm({ formState, updateFormField, onImageChange, submitIssue, submitting, categories }) {
  const fileRef = useRef(null);
  return (
    <form className="report-form" onSubmit={submitIssue}>
      <label className="field">
        <span className="field-label">Issue title</span>
        <input name="title" value={formState.title} onChange={updateFormField} placeholder="Broken streetlight near park" required />
      </label>

      <div className="form-row">
        <label className="field">
          <span className="field-label">Category</span>
          <span className="select-wrap">
            <select name="categoryId" value={formState.categoryId} onChange={updateFormField} required>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Icon name="ops" className="select-caret" />
          </span>
        </label>

        <label className="field">
          <span className="field-label"><Icon name="pin" /> Address or area</span>
          <input name="address" value={formState.address} onChange={updateFormField} placeholder="Main Street, near school" />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Description</span>
        <textarea name="description" value={formState.description} onChange={updateFormField} placeholder="Describe what happened and why it needs attention." rows="5" required />
      </label>

      <div className="image-upload">
        <span className="field-label"><Icon name="image" /> Evidence photo</span>
        <div className="image-drop">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onImageChange}
            id="evidence-photo"
            className="image-input"
          />
          {formState.imageUrl ? (
            <div className="image-preview">
              <img src={formState.imageUrl} alt="Evidence preview" />
              <button
                type="button"
                className="image-remove"
                onClick={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  onImageRemove();
                }}
              >
                <Icon name="close" /> Remove
              </button>
            </div>
          ) : (
            <label htmlFor="evidence-photo" className="image-empty">
              <Icon name="image" />
              <span>Drag or click to add a photo</span>
              <span className="muted">PNG/JPG up to 2MB</span>
            </label>
          )}
        </div>
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}

/* ============================================================
   admin app
   ============================================================ */

function AdminApp(props) {
  const { view } = props;

  if (view === "reports") return <AdminReports {...props} />;
  if (view === "operations") return <AdminOperations {...props} />;
  if (view === "teams") return <AdminTeams {...props} />;
  return <AdminDashboard {...props} />;
}

function AdminDashboard({
  loading, metrics, issues, categories, resolvedCount, totalIssues, resolvedPct, openCount,
  statusMax, setLightbox, user
}) {
  return (
    <>
      <section className="block admin-welcome">
        <Reveal className="card">
          <p className="eyebrow tone-eyebrow">Admin dashboard</p>
          <h2>Welcome, {user?.fullName?.split(" ")[0] ?? "Admin"}</h2>
          <p className="panel-sub">
            Oversee every report, balance team workload, and keep issues moving to resolution.
          </p>
        </Reveal>
      </section>

      <section className="block" id="metrics">
        <Reveal className="card metrics-panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Platform metrics</p>
              <h2>Operational snapshot</h2>
              <p className="panel-sub">Live counts for your municipal operations.</p>
            </div>
          </header>
          {loading ? (
            <div className="metrics-grid">
              <Skeleton className="metric-skeleton metric-tall" />
              <Skeleton className="metric-skeleton" />
              <Skeleton className="metric-skeleton" />
            </div>
          ) : metrics ? (
            <div className="metrics-grid">
              <MetricsPrimary total={totalIssues} resolved={resolvedCount} pct={resolvedPct} />
              <article className="metric-card">
                <span className="metric-label">By status</span>
                <StatusBars byStatus={metrics.byStatus} statusMax={statusMax} />
              </article>
              <article className="metric-card">
                <span className="metric-label">By team</span>
                <ul className="team-chips">
                  {(metrics.byTeam ?? []).map((item) => (
                    <li key={item.name}>
                      <span className="team-chip-name">{item.name}</span>
                      <span className="mono team-chip-count">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : (
            <p className="muted">Metrics are not available yet.</p>
          )}
        </Reveal>
      </section>

      <section className="block">
        <Reveal className="card">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Pipeline</p>
              <h2>Open vs resolved</h2>
            </div>
          </header>
          {metrics ? (
            <div className="kpi-row">
              <KpiCard label="Total reports" value={totalIssues} icon="report" />
              <KpiCard label="Open" value={openCount} icon="clock" />
              <KpiCard label="Resolved" value={resolvedCount} icon="check" tone="emerald" />
              <KpiCard label="Resolution rate" value={`${resolvedPct}%`} icon="ops" />
            </div>
          ) : (
            <p className="muted">No data yet.</p>
          )}
        </Reveal>
      </section>

      <section className="block">
        <Reveal className="card">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Activity</p>
              <h2>Latest reports</h2>
            </div>
          </header>
          {issues.length > 0 ? (
            <ul className="issue-list">
              {issues.slice(0, 5).map((issue) => (
                <IssueCard key={issue.id} issue={issue} setLightbox={setLightbox} />
              ))}
            </ul>
          ) : (
            <p className="muted empty">No reports loaded.</p>
          )}
        </Reveal>
      </section>
    </>
  );
}

function AdminReports(props) {
  const { loading, issues, allIssues, query, setQuery, statusFilter, setStatusFilter, selectIssue, setLightbox } = props;
  return (
    <section className="block" id="reports">
      <Reveal className="card reports-card">
        <header className="panel-head reports-head">
          <div>
            <p className="eyebrow tone-eyebrow">All reports</p>
            <h2>Triage and manage</h2>
          </div>
          <span className="count-tag mono">{issues.length}/{allIssues.length}</span>
        </header>

        {allIssues.length > 0 ? (
          <>
            <div className="filter-bar">
              <label className="search-field">
                <Icon name="search" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports…" aria-label="Search reports" />
              </label>
              <div className="filter-chips" role="group" aria-label="Filter by status">
                <button className={`chip ${statusFilter === "all" ? "chip-active" : ""}`} onClick={() => setStatusFilter("all")}>All</button>
                {workflowStatuses.map((status) => (
                  <button
                    key={status.value}
                    className={`chip tone-${status.tone} ${statusFilter === status.value ? "chip-active" : ""}`.trim()}
                    onClick={() => setStatusFilter(status.value)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {issues.length > 0 ? (
              <ul className="issue-list">
                {issues.map((issue) => (
                  <li key={issue.id} className={`issue-item ${props.selectedIssueId === issue.id ? "is-selected" : ""}`}>
                    <IssueBody issue={issue} setLightbox={setLightbox} />
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => selectIssue(issue, "operations")}>
                      <Icon name="ops" /> Manage
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted empty">No reports match your filters.</p>
            )}
          </>
        ) : loading ? (
          <ul className="issue-list">
            {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="issue-skeleton" />))}
          </ul>
        ) : (
          <p className="muted empty">No reports loaded yet.</p>
        )}
      </Reveal>
    </section>
  );
}

function AdminOperations(props) {
  const {
    selectedIssue, teams, statusNote, setStatusNote, busy, assignIssueToTeam, updateIssueStatus,
    history, setSelectedIssueId, allIssues, setLightbox
  } = props;

  return (
    <section className="block" id="operations">
      <Reveal className="card operations-panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow tone-eyebrow">Operations workflow</p>
            <h2>Issue status management</h2>
            <p className="panel-sub">Move a report through the workflow and keep an audit trail.</p>
          </div>
        </header>

        {selectedIssue ? (
          <div className="operations-grid">
            <article className="ops-card selected-issue">
              <div className="selected-head">
                <h3>{selectedIssue.title}</h3>
                <StatusBadge status={selectedIssue.status} />
              </div>
              <p className="issue-desc">{selectedIssue.description}</p>
              {selectedIssue.image_url ? (
                <button className="evidence-thumb" onClick={() => setLightbox(selectedIssue.image_url)}>
                  <img src={selectedIssue.image_url} alt="Evidence" />
                  <span className="evidence-zoom"><Icon name="image" /> View</span>
                </button>
              ) : null}
              <dl>
                <div><dt>Current status</dt><dd>{labelFor(selectedIssue.status)}</dd></div>
                <div><dt>Category</dt><dd>{selectedIssue.category ?? "Uncategorized"}</dd></div>
                <div><dt>Address</dt><dd>{selectedIssue.address || "Not provided"}</dd></div>
                <div><dt>Reported by</dt><dd>{selectedIssue.reported_by_name ?? "Anonymous"}</dd></div>
                <div><dt>Assigned team</dt><dd>{selectedIssue.assigned_team ?? "Unassigned"}</dd></div>
                <div><dt>Report id</dt><dd className="mono">#{selectedIssue.id}</dd></div>
              </dl>
            </article>

            <article className="ops-card status-actions">
              <label className="field">
                <span className="field-label">Assign team</span>
                <span className="select-wrap">
                  <select value={selectedIssue.assigned_team_id ?? ""} onChange={assignIssueToTeam} disabled={busy}>
                    <option value="">Choose responsible team</option>
                    {teams.map((team) => (<option key={team.id} value={team.id}>{team.name}</option>))}
                  </select>
                  <Icon name="ops" className="select-caret" />
                </span>
              </label>

              <label className="field">
                <span className="field-label">Status update note</span>
                <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Add a short operational note." rows="4" />
              </label>

              <span className="field-label">Move workflow</span>
              <div className="status-button-row">
                {workflowStatuses.map((status) => (
                  <button
                    key={status.value}
                    className={`status-button tone-${status.tone} ${selectedIssue.status === status.value ? "active-status" : ""}`.trim()}
                    type="button"
                    disabled={busy}
                    onClick={() => updateIssueStatus(status.value)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
              {busy ? <p className="ops-busy mono">working…</p> : null}
            </article>

            <article className="ops-card history-panel">
              <h3><Icon name="clock" /> Status history</h3>
              {history.length > 0 ? (
                <ol className="timeline">
                  {[...history].reverse().map((entry) => (
                    <li key={entry.id}>
                      <span className="timeline-dot" />
                      <div className="timeline-body">
                        <strong>{labelFor(entry.old_status)} <span className="arrow">→</span> {labelFor(entry.new_status)}</strong>
                        {entry.note ? <p>{entry.note}</p> : null}
                        <time>{new Date(entry.created_at).toLocaleString()}</time>
                        {entry.changed_by ? <span className="timeline-by"> · {entry.changed_by}</span> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">No status history yet.</p>
              )}
            </article>
          </div>
        ) : (
          <div className="empty">
            <p className="muted">Select a report to begin, or manage one from the Reports list.</p>
            {allIssues?.length > 0 ? (
              <select className="quick-pick" defaultValue="" onChange={(e) => { const id = Number(e.target.value); const iss = allIssues.find((i) => i.id === id); if (iss) props.selectIssue(iss); else setSelectedIssueId(null); }}>
                <option value="">Pick a report…</option>
                {allIssues.map((issue) => (<option key={issue.id} value={issue.id}>#{issue.id} — {issue.title}</option>))}
              </select>
            ) : null}
          </div>
        )}
      </Reveal>
    </section>
  );
}

function AdminTeams({ teams, loading }) {
  return (
    <section className="block">
      <Reveal className="card">
        <header className="panel-head">
          <div>
            <p className="eyebrow tone-eyebrow">Teams</p>
            <h2>Crew workload</h2>
            <p className="panel-sub">Number of open reports assigned to each team.</p>
          </div>
        </header>
        {loading && !teams.length ? (
          <div className="card-grid">
            {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="cat-skeleton" />))}
          </div>
        ) : teams.length > 0 ? (
          <ul className="team-list">
            {teams.map((team) => (
              <li key={team.id}>
                <span className="team-list-icon"><Icon name="team" /></span>
                <div className="team-list-info">
                  <strong>{team.name}</strong>
                  <span className="muted">{team.description}</span>
                </div>
                <span className={`team-load tone-${team.open_count > 0 ? "indigo" : "emerald"}`}>
                  <span className="mono">{team.open_count}</span> open
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted empty">No teams loaded.</p>
        )}
      </Reveal>
    </section>
  );
}

/* ============================================================
   shared building blocks
   ============================================================ */

function Dashboard({ loading, metrics, issues, categories, resolvedCount, totalIssues, resolvedPct, statusMax, setLightbox, onReport }) {
  return (
    <>
      <section className="block" id="metrics">
        <Reveal className="card metrics-panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Community</p>
              <h2>How your district is doing</h2>
              <p className="panel-sub">A live look at reports across the community.</p>
            </div>
            <button className="btn btn-sm btn-primary" onClick={onReport}>
              <Icon name="plus" /> Report an issue
            </button>
          </header>
          {loading ? (
            <div className="metrics-grid">
              <Skeleton className="metric-skeleton metric-tall" />
              <Skeleton className="metric-skeleton" />
              <Skeleton className="metric-skeleton" />
            </div>
          ) : metrics ? (
            <div className="metrics-grid">
              <MetricsPrimary total={totalIssues} resolved={resolvedCount} pct={resolvedPct} />
              <article className="metric-card">
                <span className="metric-label">By status</span>
                <StatusBars byStatus={metrics.byStatus} statusMax={statusMax} />
              </article>
              <article className="metric-card">
                <span className="metric-label">By team</span>
                <ul className="team-chips">
                  {(metrics.byTeam ?? []).map((item) => (
                    <li key={item.name}>
                      <span className="team-chip-name">{item.name}</span>
                      <span className="mono team-chip-count">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : (
            <p className="muted">Metrics are not available yet.</p>
          )}
        </Reveal>
      </section>

      <section className="block">
        <Reveal className="card">
          <header className="panel-head">
            <div>
              <p className="eyebrow tone-eyebrow">Community board</p>
              <h2>Recent reports</h2>
            </div>
          </header>
          {issues.length > 0 ? (
            <ul className="issue-list">
              {issues.slice(0, 8).map((issue) => (
                <IssueCard key={issue.id} issue={issue} setLightbox={setLightbox} />
              ))}
            </ul>
          ) : (
            <p className="muted empty">No reports yet. Be the first to file one.</p>
          )}
        </Reveal>
      </section>

      {categories.length > 0 ? (
        <section className="block">
          <Reveal className="card">
            <header className="panel-head"><div><p className="eyebrow tone-eyebrow">Categories</p><h2>What you can report</h2></div></header>
            <ul className="category-list">
              {categories.map((category, index) => (
                <Reveal as="li" key={category.id} delay={index * 50}>
                  <strong>{category.name}</strong>
                  <span>{category.description}</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </section>
      ) : null}
    </>
  );
}

function MetricsPrimary({ total, resolved, pct }) {
  return (
    <article className="metric-card primary-metric">
      <span className="metric-label">Total reports</span>
      <CountUp value={total} />
      <span className="metric-foot">{resolved} resolved · {pct}% rate</span>
      <span className="metric-bar"><span className="metric-bar-fill" style={{ "--bar-w": `${pct}%` }} /></span>
    </article>
  );
}

function StatusBars({ byStatus, statusMax }) {
  return (
    <ul className="status-bars">
      {(byStatus ?? []).map((item) => {
        const pct = Math.round((item.count / statusMax) * 100);
        return (
          <li key={item.status}>
            <div className="status-bars-head">
              <StatusBadge status={item.status} />
              <strong className="mono">{item.count}</strong>
            </div>
            <span className="bar-track">
              <span className={`bar-fill tone-${toneFor(item.status)}`} style={{ "--bar-w": `${pct}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function KpiCard({ label, value, icon, tone }) {
  return (
    <div className="kpi-card">
      <span className={`kpi-icon ${tone ? `tone-${tone}` : ""}`}><Icon name={icon} /></span>
      <span className="metric-label">{label}</span>
      <strong className="kpi-value mono">{value}</strong>
    </div>
  );
}

function IssueCard({ issue, setLightbox }) {
  return (
    <div>
      <IssueBody issue={issue} setLightbox={setLightbox} />
    </div>
  );
}

function IssueBody({ issue, setLightbox }) {
  return (
    <>
      <div className="issue-top">
        <div className="issue-titles">
          <strong>{issue.title}</strong>
          <span className="issue-meta"><Icon name="pin" /> {issue.category ?? "Uncategorized"}</span>
        </div>
        <StatusBadge status={issue.status} />
      </div>
      {issue.image_url ? (
        <button className="evidence-thumb evidence-thumb-sm" onClick={() => setLightbox(issue.image_url)}>
          <img src={issue.image_url} alt="Evidence" />
          <span className="evidence-zoom"><Icon name="image" /></span>
        </button>
      ) : null}
      <p className="issue-desc">{issue.description}</p>
      <footer className="issue-foot">
        <span className="issue-foot-row"><Icon name="clock" /> <span className="mono">#{issue.id}</span></span>
        <span className="issue-priority">Priority · {issue.priority ?? "—"}</span>
        <span className="team-chip">{issue.assigned_team ?? "Unassigned"}</span>
      </footer>
    </>
  );
}
