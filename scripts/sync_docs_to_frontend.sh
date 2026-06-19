#!/usr/bin/env bash
# docs/ is de bron; de app rendert kopieën uit frontend/content/.
# Draai dit script na het bewerken van de gids of het routingboard.
set -euo pipefail
cd "$(dirname "$0")/.."
cp docs/LX708_Opname_Gids.md frontend/content/gids.md
cp docs/Studio_Routing_Ideeenboard.md frontend/content/studio.md
echo "frontend/content/ gesynchroniseerd vanuit docs/"
