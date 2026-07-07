import React, { useEffect, useState } from "react";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const workflowStatuses = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "assigned", label: "Assigned" },
  { value: "resolved", label: "Resolved" }
];

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [history, setHistory] = useState([]);
  const [operationMessage, setOperationMessage] = useState("");
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    categoryId: "",
    address: ""
  });
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    async function loadPlatformStatus() {
      try {
        const [
          healthResponse,
          categoriesResponse,
          teamsResponse,
          issuesResponse,
          metricsResponse
        ] =
          await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/api/categories`),
          fetch(`${apiBaseUrl}/api/teams`),
          fetch(`${apiBaseUrl}/api/issues`),
          fetch(`${apiBaseUrl}/api/metrics/summary`)
        ]);

        if (!healthResponse.ok) {
          throw new Error("Backend health check failed");
        }

        const categoriesPayload = await categoriesResponse.json();
        const teamsPayload = await teamsResponse.json();
        const issuesPayload = await issuesResponse.json();
        const metricsPayload = await metricsResponse.json();

        setApiStatus("connected");
        setCategories(categoriesPayload.data ?? []);
        setTeams(teamsPayload.data ?? []);
        setIssues(issuesPayload.data ?? []);
        setMetrics(metricsPayload.data ?? null);
      } catch (error) {
        setApiStatus("unavailable");
      }
    }

    loadPlatformStatus();
  }, []);

  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);

  function updateFormField(event) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  async function submitIssue(event) {
    event.preventDefault();
    setFormMessage("Submitting report...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          categoryId: Number(formState.categoryId),
          address: formState.address
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not submit issue");
      }

      setIssues((current) => [payload.data, ...current]);
      await refreshMetrics();
      setFormState({
        title: "",
        description: "",
        categoryId: "",
        address: ""
      });
      setFormMessage("Issue report submitted successfully.");
    } catch (error) {
      setFormMessage(error.message);
    }
  }

  async function refreshIssueHistory(issueId) {
    const response = await fetch(`${apiBaseUrl}/api/issues/${issueId}/history`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Could not load issue history");
    }

    setHistory(payload.data ?? []);
  }

  async function selectIssue(issue) {
    setSelectedIssueId(issue.id);
    setOperationMessage("");

    try {
      await refreshIssueHistory(issue.id);
    } catch (error) {
      setOperationMessage(error.message);
    }
  }

  async function updateIssueStatus(nextStatus) {
    if (!selectedIssue) {
      return;
    }

    setOperationMessage("Updating issue status...");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/issues/${selectedIssue.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: nextStatus,
            note: statusNote
          })
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update status");
      }

      setIssues((current) =>
        current.map((issue) =>
          issue.id === selectedIssue.id ? { ...issue, ...payload.data } : issue
        )
      );
      setStatusNote("");
      await refreshIssueHistory(selectedIssue.id);
      await refreshMetrics();
      setOperationMessage("Issue status updated.");
    } catch (error) {
      setOperationMessage(error.message);
    }
  }

  async function assignIssueToTeam(event) {
    if (!selectedIssue) {
      return;
    }

    const teamId = Number(event.target.value);

    if (!teamId) {
      return;
    }

    setOperationMessage("Assigning report...");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/issues/${selectedIssue.id}/assignment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ teamId })
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not assign report");
      }

      setIssues((current) =>
        current.map((issue) =>
          issue.id === selectedIssue.id ? { ...issue, ...payload.data } : issue
        )
      );
      await refreshIssueHistory(selectedIssue.id);
      await refreshMetrics();
      setOperationMessage("Report assigned to team.");
    } catch (error) {
      setOperationMessage(error.message);
    }
  }

  async function refreshMetrics() {
    const response = await fetch(`${apiBaseUrl}/api/metrics/summary`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Could not refresh metrics");
    }

    setMetrics(payload.data ?? null);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">CubIC ClouD Capstone</p>
        <h1>CivicFix Platform</h1>
        <p className="hero-copy">
          A three-tier community issue reporting and resolution system for
          turning local problems into trackable, accountable repair workflows.
        </p>
        <div className="status-card">
          <span className={`status-dot status-${apiStatus}`} />
          Backend API status: <strong>{apiStatus}</strong>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>For residents</h2>
          <p>
            Report potholes, broken lights, unsafe sidewalks, waste issues, and
            other local infrastructure problems.
          </p>
        </article>

        <article className="card">
          <h2>For teams</h2>
          <p>
            Triage reports, assign work, update status, and keep a transparent
            history of progress.
          </p>
        </article>

        <article className="card">
          <h2>For DevOps</h2>
          <p>
            Demonstrate containers, CI/CD, Kubernetes, observability, security,
            infrastructure-as-code, and operational runbooks.
          </p>
        </article>
      </section>

      <section className="card metrics-panel">
        <div>
          <p className="eyebrow dark-eyebrow">Platform metrics</p>
          <h2>Operational snapshot</h2>
          <p>
            These metrics make the app easier to monitor later with Prometheus
            and Grafana.
          </p>
        </div>

        {metrics ? (
          <div className="metrics-grid">
            <article className="metric-card primary-metric">
              <span>Total reports</span>
              <strong>{metrics.totalIssues}</strong>
            </article>

            <article className="metric-card">
              <span>By status</span>
              <ul>
                {metrics.byStatus.map((item) => (
                  <li key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="metric-card">
              <span>By team</span>
              <ul>
                {metrics.byTeam.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <p>Metrics are not available yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Initial issue categories</h2>
        {categories.length > 0 ? (
          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <strong>{category.name}</strong>
                <span>{category.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No categories loaded yet. Start the backend and PostgreSQL services.</p>
        )}
      </section>

      <section className="two-column">
        <form className="card issue-form" onSubmit={submitIssue}>
          <h2>Report a local issue</h2>
          <label>
            Issue title
            <input
              name="title"
              value={formState.title}
              onChange={updateFormField}
              placeholder="Broken streetlight near park"
              required
            />
          </label>

          <label>
            Category
            <select
              name="categoryId"
              value={formState.categoryId}
              onChange={updateFormField}
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Address or area
            <input
              name="address"
              value={formState.address}
              onChange={updateFormField}
              placeholder="Main Street, near school"
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={formState.description}
              onChange={updateFormField}
              placeholder="Describe what happened and why it needs attention."
              rows="5"
              required
            />
          </label>

          <button type="submit">Submit report</button>
          {formMessage ? <p className="form-message">{formMessage}</p> : null}
        </form>

        <section className="card">
          <h2>Recent reports</h2>
          {issues.length > 0 ? (
            <ul className="issue-list">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <div>
                    <strong>{issue.title}</strong>
                    <span>{issue.category ?? "Uncategorized"}</span>
                  </div>
                  <p>{issue.description}</p>
                  <footer>
                    <span>Status: {issue.status}</span>
                    <span>Priority: {issue.priority}</span>
                  </footer>
                  <p className="team-chip">
                    Team: {issue.assigned_team ?? "Unassigned"}
                  </p>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => selectIssue(issue)}
                  >
                    Manage report
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No reports loaded yet.</p>
          )}
        </section>
      </section>

      <section className="card operations-panel">
        <div>
          <p className="eyebrow dark-eyebrow">Operations workflow</p>
          <h2>Issue status management</h2>
          <p>
            Select a report, move it through the maintenance workflow, and keep
            a status history for audit and operations evidence.
          </p>
        </div>

        {selectedIssue ? (
          <div className="operations-grid">
            <article className="selected-issue">
              <h3>{selectedIssue.title}</h3>
              <p>{selectedIssue.description}</p>
              <dl>
                <div>
                  <dt>Current status</dt>
                  <dd>{selectedIssue.status}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{selectedIssue.category ?? "Uncategorized"}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{selectedIssue.address || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Assigned team</dt>
                  <dd>{selectedIssue.assigned_team ?? "Unassigned"}</dd>
                </div>
              </dl>
            </article>

            <article className="status-actions">
              <label>
                Assign team
                <select
                  value={selectedIssue.assigned_team_id ?? ""}
                  onChange={assignIssueToTeam}
                >
                  <option value="">Choose responsible team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status update note
                <textarea
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  placeholder="Add a short operational note."
                  rows="4"
                />
              </label>

              <div className="status-button-row">
                {workflowStatuses.map((status) => (
                  <button
                    key={status.value}
                    className={
                      selectedIssue.status === status.value
                        ? "status-button active-status"
                        : "status-button"
                    }
                    type="button"
                    onClick={() => updateIssueStatus(status.value)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              {operationMessage ? (
                <p className="form-message">{operationMessage}</p>
              ) : null}
            </article>

            <article className="history-panel">
              <h3>Status history</h3>
              {history.length > 0 ? (
                <ol>
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <strong>
                        {entry.old_status ?? "created"} → {entry.new_status}
                      </strong>
                      {entry.note ? <p>{entry.note}</p> : null}
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No status history yet.</p>
              )}
            </article>
          </div>
        ) : (
          <p>Select “Manage report” from a recent report to begin.</p>
        )}
      </section>
    </main>
  );
}
