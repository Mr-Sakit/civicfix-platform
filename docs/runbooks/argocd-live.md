# Argo CD live runbook

## Install Argo CD

```powershell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

If the optional `ApplicationSet` CRD fails because of annotation size, continue if these CRDs exist:

```powershell
kubectl get crd applications.argoproj.io appprojects.argoproj.io
```

## Apply CivicFix GitOps project and Student apps

```powershell
kubectl apply -f deploy/gitops/argocd/bootstrap/civicfix-project.yaml
kubectl apply -f deploy/gitops/argocd/apps/civicfix-student-application.yaml
kubectl apply -f deploy/gitops/argocd/apps/civicfix-student-monitoring.yaml
```

## Verify

```powershell
kubectl -n argocd get applications.argoproj.io -o wide
```

Expected:

```text
civicfix-student-application   Synced   Healthy
civicfix-student-monitoring    Synced   Healthy
```

## Open Argo CD UI

```powershell
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

Open:

```text
https://localhost:8080
```

## Initial admin password

```powershell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
```

Decode the returned Base64 value before using it.
