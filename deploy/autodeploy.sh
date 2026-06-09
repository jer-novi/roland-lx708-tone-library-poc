#!/usr/bin/env bash
# Runs every 5 minutes via systemd timer (installed by bootstrap.sh):
# pulls main and redeploys when there are new commits. Also removes
# temporary SSH keys whose embedded expiry date has passed.
set -euo pipefail

# --- clean up expired temp keys (comment: lx708-temp-expires-YYYY-MM-DD) ---
AUTH_KEYS=/root/.ssh/authorized_keys
if [ -f "$AUTH_KEYS" ] && grep -q "lx708-temp-expires-" "$AUTH_KEYS"; then
  today=$(date +%F)
  tmp=$(mktemp)
  while IFS= read -r line; do
    expiry=$(printf '%s' "$line" | grep -o 'lx708-temp-expires-[0-9-]*' | cut -d- -f4-6 || true)
    if [ -n "$expiry" ] && [[ "$expiry" < "$today" ]]; then
      echo "Removing expired temp SSH key (expired $expiry)"
      continue
    fi
    printf '%s\n' "$line" >> "$tmp"
  done < "$AUTH_KEYS"
  cat "$tmp" > "$AUTH_KEYS" && rm -f "$tmp"
fi

# --- redeploy on new commits ---
cd /opt/lx708
git fetch origin main -q
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi
echo "New commits on main ($LOCAL -> $REMOTE), redeploying"
git reset --hard origin/main
cd deploy
docker compose up -d --build
docker image prune -f
echo "Deployed $REMOTE"
