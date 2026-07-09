#!/usr/bin/env bash
set -euo pipefail

found=0
pattern='GF_SECURITY_ADMIN_PASSWORD[[:space:]]*:[[:space:]]*["'\''][^"'\'']{8,}["'\'']'

while IFS= read -r commit; do
  while IFS=: read -r object file line content; do
    if [[ "${content}" =~ replace-with-[a-z0-9-]+ ]]; then
      continue
    fi

    short_commit="${commit:0:12}"
    echo "::error file=${file},line=${line}::Potential Grafana admin password detected in Git history at commit ${short_commit}. Value redacted."
    found=1
  done < <(git grep -I -n -E "${pattern}" "${commit}" -- '*.yaml' '*.yml' 2>/dev/null || true)
done < <(git rev-list --all)

if [[ "${found}" -ne 0 ]]; then
  echo "Secret history scan failed. Rotate the credential and rewrite Git history before treating the repository as clean."
  exit 1
fi

echo "Secret history scan passed."
