#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/install-docker-ubuntu.sh"
  exit 1
fi

if [[ -r /etc/os-release ]]; then
  . /etc/os-release
fi

if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "This installer is intended for Ubuntu. Detected: ${PRETTY_NAME:-unknown}"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

ARCH="$(dpkg --print-architecture)"
CODENAME="${VERSION_CODENAME:-$(. /etc/os-release && echo "$VERSION_CODENAME")}"

cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

TARGET_USER="${SUDO_USER:-${USER}}"
if id "${TARGET_USER}" >/dev/null 2>&1; then
  usermod -aG docker "${TARGET_USER}"
fi

docker --version
docker compose version

echo
echo "Docker installed."
echo "Log out and log back in, or run: newgrp docker"
