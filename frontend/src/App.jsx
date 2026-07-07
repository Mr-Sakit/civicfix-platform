import { useEffect, useState } from "react";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadPlatformStatus() {
      try {
        const [healthResponse, categoriesResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/api/categories`)
        ]);

        if (!healthResponse.ok) {
          throw new Error("Backend health check failed");
        }

        const categoriesPayload = await categoriesResponse.json();

        setApiStatus("connected");
        setCategories(categoriesPayload.data ?? []);
      } catch (error) {
        setApiStatus("unavailable");
      }
    }

    loadPlatformStatus();
  }, []);

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
    </main>
  );
}
