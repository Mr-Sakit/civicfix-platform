# Argo CD live deployment evidence

Date: 2026-07-08

## Purpose

Install Argo CD on the live AKS Student cluster and register GitOps applications for the CivicFix Student app and monitoring stack.

## Namespace

```text
argocd
```

## Installed components

Core Argo CD components are running:

```text
argocd-application-controller   1/1 Running
argocd-dex-server               1/1 Running
argocd-notifications-controller 1/1 Running
argocd-redis                    1/1 Running
argocd-repo-server              1/1 Running
argocd-server                   1/1 Running
```

The upstream stable manifest reported an annotation-size issue for the optional `ApplicationSet` CRD, but the required `Application` and `AppProject` CRDs were installed successfully. The current GitOps demo uses standard Argo CD `Application` resources, so ApplicationSet is not required.

## GitOps applications

Registered Argo CD applications:

```text
civicfix-student-application   Synced   Healthy
civicfix-student-monitoring    Synced   Healthy
```

Both applications sync from:

```text
https://github.com/Mr-Sakit/civicfix-platform.git
```

## Managed paths

Student application:

```text
deploy/kubernetes/overlays/aks-student
```

Student monitoring:

```text
deploy/kubernetes/overlays/monitoring-aks-student
```

## Access during demo

Use port-forwarding instead of a public LoadBalancer:

```powershell
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

Then open:

```text
https://localhost:8080
```
