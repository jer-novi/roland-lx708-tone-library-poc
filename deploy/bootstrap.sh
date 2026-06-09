#!/usr/bin/env bash
# One-time droplet setup for the Roland LX708 Tone Library backend.
# Usage (in the DigitalOcean droplet console, as root):
#   export DB_PASSWORD='choose-a-strong-password'
#   curl -fsSL https://raw.githubusercontent.com/jer-novi/roland-lx708-tone-library-poc/main/deploy/bootstrap.sh | bash
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
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Writing deploy/.env"
cat > "$APP_DIR/deploy/.env" <<EOF
DB_PASSWORD=${DB_PASSWORD}
EOF
chmod 600 "$APP_DIR/deploy/.env"

echo "==> Building and starting containers"
cd "$APP_DIR/deploy"
docker compose up -d --build

echo "==> Done. Within ~2 minutes the API is live at:"
echo "    https://188-166-80-4.sslip.io/actuator/health"
echo "    https://188-166-80-4.sslip.io/api/tones?category=Piano"
echo ""
echo "Seed the Wikipedia data once with:"
echo "    curl -X POST https://188-166-80-4.sslip.io/api/wiki/refresh-missing"
