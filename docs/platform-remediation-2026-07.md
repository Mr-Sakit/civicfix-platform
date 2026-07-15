# CivicFix platform remediation — July 2026

This document describes the fixes applied to three platform problems: weak
monitoring, incorrectly configured Terraform state, and hard-coded Kubernetes
scaling. Each section explains the root cause, what changed, and how to roll it
out.

---

## 1. Terraform remote state

### Problem

There was **no `backend` block anywhere** in `infrastructure/terraform/azure`, so
Terraform used the default **local** backend. State (`terraform.tfstate`, which
even existed locally in the working directory) lived on whoever ran `apply`. That
means no locking (two applies can corrupt state), no shared source of truth, and
a real risk of losing state — which includes the generated PostgreSQL password.

### What changed

- **`infrastructure/terraform/azure/backend.tf`** *(new)* — activates the Azure
  Storage backend using a **partial configuration** (an empty `azurerm` block
  plus `use_azuread_auth = true`). No environment-specific or secret values are
  committed; concrete values are supplied at init time. Azure Blob leases provide
  automatic **state locking**.
- **`infrastructure/terraform/azure/backend/bootstrap-state.sh`** *(new)* — a
  one-time, idempotent script that creates the state resource group, a storage
  account (TLS 1.2, no public blob access, Azure AD auth only, blob versioning
  for recoverable history), and the `tfstate` container, and grants the caller
  `Storage Blob Data Contributor`.
- **`backend/backend.config.example`** — updated to the partial-config values.
- **`backend/backend.tf.example`** — kept as the alternative fully-inline form,
  clearly marked as optional.
- **`.gitignore`** — now ignores the real `backend.config`.
- READMEs (`azure/README.md`, `azure/backend/README.md`) updated: remote state is
  now *active* rather than "not yet".

### Rollout

```bash
cd infrastructure/terraform/azure
./backend/bootstrap-state.sh                          # once per subscription
cp backend/backend.config.example backend/backend.config
# paste the printed storage account name into backend.config
terraform init -backend-config=backend/backend.config
```

Terraform will detect the existing local state and offer to **migrate** it to
Azure Storage — accept it. Afterwards delete the local `terraform.tfstate` and
`terraform.tfstate.backup` files.

---

## 2. Hard-coded Kubernetes scaling

### Problem

Every workload had a fixed `replicas` count and there was **no
HorizontalPodAutoscaler** anywhere in the tree. The prod overlay even pinned the
backend and frontend to `replicas: 1`, so a traffic spike had no way to add
capacity, and a single pod failure meant an outage.

### What changed *(prod only, as scoped)*

- **`deploy/kubernetes/overlays/prod/hpa.yaml`** *(new)* — HPAs for backend
  (min 2 / max 8, CPU 70% + memory 80%) and frontend (min 2 / max 6, CPU 70%),
  each with sane scale-up/scale-down behavior windows.
- **`overlays/prod/backend-patch.yaml`** and **`frontend-patch.yaml`** — removed
  the hard-coded `replicas` so the HPA owns the replica count.
- **`overlays/prod/kustomization.yaml`** — added `hpa.yaml`.
- **`gitops/argocd/apps/civicfix-prod-application.yaml`** — added
  `ignoreDifferences` on `/spec/replicas` for both Deployments. Without this,
  Argo CD `selfHeal` would continually reset replicas to the Git value and fight
  the autoscaler.

### Prerequisite

HPA needs the **metrics-server**, which is installed by default on AKS. Verify
with `kubectl top pods -n civicfix-prod`.

### Not changed

Dev/student overlays keep fixed replicas (intentionally small). The **AI worker**
was left on fixed replicas because it is a queue consumer — CPU-based HPA is a
poor fit; scaling it well needs a queue-depth (KEDA / custom) metric. See
follow-ups.

---

## 3. Weak monitoring

### Problem

The monitoring stack (`deploy/kubernetes/monitoring`) had several serious gaps:

- Prometheus scraped only **two hard-coded app targets** via `static_configs`,
  bound to the `civicfix-prod` namespace DNS names. No cluster, node, pod, or
  control-plane metrics at all.
- Prometheus stored data in an **`emptyDir`** — every restart wiped all history.
- **No Alertmanager** — alert rules evaluated but had nowhere to go.
- Alert rules were mostly **business trivia** ("an unresolved issue exists")
  rather than reliability signals.

### What changed

- **`prometheus.yaml`** — rewritten:
  - Persistent **10Gi PVC** replaces `emptyDir`; `Recreate` strategy; 15-day
    retention.
  - **Kubernetes service discovery** with **RBAC** (ClusterRole/Binding) for the
    Prometheus ServiceAccount. New scrape jobs: API servers, node kubelets,
    **cAdvisor** (per-container usage), kube-state-metrics, node-exporter, and
    annotation-based **pod discovery** (`prometheus.io/scrape`) that finds
    backend/worker pods in **any** namespace — no more hard-coded prod DNS.
  - **`alerting`** block pointing Prometheus at Alertmanager.
- **`kube-state-metrics.yaml`** *(new)* — cluster object state (deployments,
  pods, HPAs, PVCs…), with its own RBAC.
- **`node-exporter.yaml`** *(new)* — DaemonSet for node CPU/memory/disk/network.
- **`alertmanager.yaml`** *(new)* — Alertmanager with severity-based routing and
  inhibition. The notifier is a documented placeholder — wire up Slack/webhook by
  completing the commented block and storing the URL in a Secret.
- **`prometheus-rules/civicfix-alerts.yaml`** — rewritten into real SRE alerts:
  target/worker down, backend **5xx error rate** and **p95 latency**, AI job
  failures, **pod crash-looping**, unavailable replicas, container memory-near-limit
  and CPU throttling, **HPA maxed out**, node NotReady / high CPU / memory /
  disk, and PVC-almost-full. The original business alerts are retained.
- **`base/backend.yaml`** and **`base/worker.yaml`** — added
  `prometheus.io/scrape` pod annotations so discovery works in every environment.
- **`monitoring/kustomization.yaml`** — registers the three new components.

### Note on the student overlay

The student monitoring overlay inherits the new components but keeps its own
minimal static Prometheus config (no Alertmanager reference), so nothing breaks.
The extra lightweight pods there are unused; trimming them is an optional
follow-up.

---

## Validation performed

- YAML well-formedness of the new/rewritten manifests, including the embedded
  `prometheus.yml`/`alertmanager.yml` and the PromQL block-scalar alert rules.
- Confirmed every kustomize `resources:` reference resolves to a file that exists.
- `kustomize build` / `kubeconform` / `terraform validate` could **not** be run
  in this environment (no cluster access, and the sandbox has no network to fetch
  schema tooling). Run these in CI before merge:

  ```bash
  kustomize build deploy/kubernetes/overlays/prod | kubeconform -strict -summary
  kustomize build deploy/kubernetes/monitoring   | kubeconform -strict -summary
  cd infrastructure/terraform/azure && terraform fmt -check -recursive && terraform validate
  ```

## Suggested follow-ups

1. Wire Alertmanager to a real channel (Slack/PagerDuty/webhook) via a Secret.
2. Add a PodDisruptionBudget for backend/frontend now that they autoscale.
3. Add a Grafana dashboard for cluster/node metrics (kube-state-metrics +
   node-exporter) to complement the app overview.
4. Autoscale the AI worker on queue depth (KEDA) instead of leaving it fixed.
5. Consider HPA for the student environment if it ever serves real traffic.
