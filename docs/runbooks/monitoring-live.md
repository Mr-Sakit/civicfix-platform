# Monitoring live runbook

## Deploy

```powershell
kubectl apply -k deploy/kubernetes/overlays/monitoring-aks-student
```

## Verify

```powershell
kubectl -n civicfix-monitoring get pods
kubectl -n civicfix-monitoring get svc
```

## Open Grafana

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-grafana 3001:3000
```

Open:

```text
http://localhost:3001
```

## Open Prometheus

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-prometheus 9090:9090
```

Open:

```text
http://localhost:9090
```

## Check Prometheus target

Prometheus should show the `civicfix-backend` target as `up`.

Useful query:

```text
civicfix_issues_total
```

## Remove

```powershell
kubectl delete -k deploy/kubernetes/overlays/monitoring-aks-student
```
