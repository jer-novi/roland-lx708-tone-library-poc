#!/usr/bin/env bash
# One-time droplet setup for the Roland LX708 Tone Library backend.
# Usage (in the DigitalOcean droplet console, as root):
#   export DB_PASSWORD='choose-a-strong-password'
#   curl -fsSL https://raw.githubusercontent.com/jer-novi/roland-lx708-tone-library-poc/main/deploy/bootstrap.sh | bash
#
# Optional: grant temporary SSH access (auto-removed after 30 days):
#   export CLAUDE_SSH_PUBKEY='ssh-ed25519 AAAA... comment'
set -euo pipefail

REPO_URL="https://github.com/jer-novi/roland-lx708-tone-library-poc.git"
APP_DIR="/opt/lx708"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "ERROR: export DB_PASSWORD='...' first" >&2
  exit 1
fi

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Cloning or updating repo"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin main -q
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Writing deploy/.env"
cat > "$APP_DIR/deploy/.env" <<EOF
DB_PASSWORD=${DB_PASSWORD}
EOF
chmod 600 "$APP_DIR/deploy/.env"

if [ -n "${CLAUDE_SSH_PUBKEY:-}" ]; then
  echo "==> Installing temporary SSH key (expires in 30 days)"
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  expiry=$(date -d '+30 days' +%F)
  echo "${CLAUDE_SSH_PUBKEY} lx708-temp-expires-${expiry}" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  echo "    Key registered, auto-removed on ${expiry}"
fi

echo "==> Building and starting containers"
cd "$APP_DIR/deploy"
docker compose up -d --build

echo "==> Installing auto-deploy timer (checks main every 5 minutes)"
chmod +x "$APP_DIR/deploy/autodeploy.sh" "$APP_DIR/deploy/update.sh"
cat > /etc/systemd/system/lx708-deploy.service <<'EOF'
[Unit]
Description=LX708 redeploy on new commits

[Service]
Type=oneshot
ExecStart=/opt/lx708/deploy/autodeploy.sh
EOF
cat > /etc/systemd/system/lx708-deploy.timer <<'EOF'
[Unit]
Description=Check LX708 repo every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now lx708-deploy.timer

echo ""
echo "==> Done. Within ~2 minutes the API is live at:"
echo "    https://lx708.jvdz.me/actuator/health"
echo "    https://lx708.jvdz.me/api/tones?category=Piano"
echo ""
echo "Seed the Wikipedia data once with:"
echo "    curl -X POST https://lx708.jvdz.me/api/wiki/refresh-missing"
echo ""
echo "New commits on main now deploy automatically within 5 minutes."
