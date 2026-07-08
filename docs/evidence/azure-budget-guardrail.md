# Azure budget guardrail evidence

Date: 2026-07-08

## Purpose

Add a cost-control guardrail while the Azure Student AKS environment remains active for testing and demo preparation.

## Budget

Subscription:

- `Azure for Students`

Budget:

- Name: `civicfix-student-monthly-20`
- Category: `Cost`
- Amount: `$20`
- Time grain: `Monthly`

Verification:

```text
Amount    Category    Name                         TimeGrain
--------  ----------  ---------------------------  -----------
20.0      Cost        civicfix-student-monthly-20  Monthly
```

## Notification thresholds

The budget was configured with email notifications at:

- 50%
- 80%
- 100%

## Notes

This budget does not automatically shut down resources. It is an alerting guardrail. To stop cost, remove workloads or destroy the Terraform-managed Azure stack.
