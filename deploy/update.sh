#!/usr/bin/env bash
# Redeploy after new commits on main:
#   /opt/lx708/deploy/update.sh
set -euo pipefail
cd /opt/lx708
git pull --ff-only
cd deploy
docker compose up -d --build
docker image prune -f
echo "Deployed $(git rev-parse --short HEAD)"
