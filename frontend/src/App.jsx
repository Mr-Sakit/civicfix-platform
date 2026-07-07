import { useEffect, useState } from "react";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [categories, setCategories] = useState([]);
  const [issues, setIssues] = useState([]);
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
        const [healthResponse, categoriesResponse, issuesResponse] =
          await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/api/categories`),
          fetch(`${apiBaseUrl}/api/issues`)
        ]);

        if (!healthResponse.ok) {
          throw new Error("Backend health check failed");
        }

        const categoriesPayload = await categoriesResponse.json();
        const issuesPayload = await issuesResponse.json();

        setApiStatus("connected");
        setCategories(categoriesPayload.data ?? []);
        setIssues(issuesPayload.data ?? []);
      } catch (error) {
        setApiStatus("unavailable");
      }
    }

    loadPlatformStatus();
  }, []);

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
                </li>
              ))}
            </ul>
          ) : (
            <p>No reports loaded yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
