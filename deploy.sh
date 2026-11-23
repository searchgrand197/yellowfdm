#!/usr/bin/env bash
# Deploy Foodporium to VPS: /root/yellowfdm  →  https://www.foodporium.in
# Usage (on the VPS as root):
#   curl -fsSL https://raw.githubusercontent.com/searchgrand197/yellowfdm/main/deploy.sh | bash
#   OR:  cd /root/yellowfdm && bash deploy.sh
# Options:
#   bash deploy.sh --seed     # also run import_v1 (first-time menu import)
#   bash deploy.sh --ssl      # issue/renew Let's Encrypt cert via certbot

set -euo pipefail

APP_DIR="${APP_DIR:-/root/yellowfdm}"
REPO_URL="${REPO_URL:-https://github.com/searchgrand197/yellowfdm.git}"
DOMAIN_WWW="www.foodporium.in"
DOMAIN_APEX="foodporium.in"
BRANCH="${BRANCH:-main}"
SEED=0
SSL=0

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=1 ;;
    --ssl) SSL=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

log() { echo -e "\n==> $*\n"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run deploy.sh as root on the VPS." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log "Installing system packages"
apt-get update -y
# Note: do NOT apt-install `npm` — NodeSource `nodejs` already ships npm and conflicts with Debian npm.
apt-get install -y \
  git curl nginx certbot python3-certbot-nginx \
  python3 python3-venv python3-pip \
  build-essential zlib1g-dev \
  libjpeg-turbo8-dev || apt-get install -y libjpeg62-turbo-dev || true

ensure_node() {
  # Firebase 13+ wants Node >= 24 for engine checks; use 24.x when possible.
  local major=0
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [[ "${major}" -ge 24 ]]; then
      log "Using existing Node $(node -v) / npm $(npm -v)"
      return 0
    fi
  fi
  log "Installing Node.js 24.x via NodeSource (includes npm)"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
}

ensure_node
command -v node >/dev/null
command -v npm >/dev/null

log "Fetching code into ${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  cd "${APP_DIR}"
  git fetch origin
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
else
  rm -rf "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  log "Creating .env from example (edit secrets if needed)"
  if [[ -f "${APP_DIR}/.env.example" ]]; then
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  else
    cat > "${APP_DIR}/.env" <<EOF
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=$(openssl rand -hex 32)
DJANGO_ALLOWED_HOSTS=${DOMAIN_WWW},${DOMAIN_APEX}
CSRF_TRUSTED_ORIGINS=https://${DOMAIN_WWW},https://${DOMAIN_APEX}
CORS_ALLOWED_ORIGINS=https://${DOMAIN_WWW},https://${DOMAIN_APEX}
EOF
  fi
  # Ensure a strong secret if still placeholder
  if grep -q 'change-me-to-a-long-random-string' "${APP_DIR}/.env" 2>/dev/null; then
    sed -i "s/change-me-to-a-long-random-string/$(openssl rand -hex 32)/" "${APP_DIR}/.env"
  fi
fi

# Blank Razorpay lines from older .env.example break auth — strip them so app defaults apply.
if [[ -f "${APP_DIR}/.env" ]]; then
  sed -i '/^RAZORPAY_API_KEY=\s*$/d;/^RAZORPAY_API_SECRET=\s*$/d' "${APP_DIR}/.env" || true
fi

set -a
# shellcheck disable=SC1091
source "${APP_DIR}/.env"
set +a
export DJANGO_DEBUG="${DJANGO_DEBUG:-0}"

log "Building frontend"
cd "${APP_DIR}"
# Need full install (incl. vite/typescript) to run the production build
rm -rf node_modules
npm ci || npm install
npm run build
# Drop build-only tooling after dist/ is produced (optional size save)
npm prune --omit=dev || true

log "Setting up Python backend"
cd "${APP_DIR}/backend"
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

mkdir -p media staticfiles
python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [[ "${SEED}" -eq 1 ]]; then
  log "Seeding menu from foodporiumv1.0 (import_v1)"
  python manage.py import_v1 || true
fi

deactivate

log "Installing systemd service"
cp "${APP_DIR}/deploy/yellowfdm.service" /etc/systemd/system/yellowfdm.service
systemctl daemon-reload
systemctl enable yellowfdm
systemctl restart yellowfdm

log "Configuring nginx for ${DOMAIN_WWW}"
cp "${APP_DIR}/deploy/nginx-foodporium.conf" /etc/nginx/sites-available/foodporium
ln -sfn /etc/nginx/sites-available/foodporium /etc/nginx/sites-enabled/foodporium
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [[ "${SSL}" -eq 1 ]]; then
  log "Requesting Let's Encrypt certificate"
  certbot --nginx -d "${DOMAIN_WWW}" -d "${DOMAIN_APEX}" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect || true
fi

systemctl --no-pager --full status yellowfdm || true

log "Deploy complete"
echo "App dir : ${APP_DIR}"
echo "Domain  : https://${DOMAIN_WWW}"
echo "API     : https://${DOMAIN_WWW}/api/"
echo "Admin   : https://${DOMAIN_WWW}/admin/"
echo
echo "First-time menu seed:  bash ${APP_DIR}/deploy.sh --seed"
echo "Enable HTTPS:          bash ${APP_DIR}/deploy.sh --ssl"
echo "Edit secrets:          nano ${APP_DIR}/.env && systemctl restart yellowfdm"
