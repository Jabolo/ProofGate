#!/usr/bin/env bash
# GCE Debian 12 bootstrap. Run as root; never enable shell tracing.
# Source and private state arrive separately in /opt/proofgate-transfer.tgz.
set -euo pipefail
umask 077
export DEBIAN_FRONTEND=noninteractive
if [[ $(id -u) != 0 ]]; then echo 'Root is required for Debian bootstrap.' >&2; exit 1; fi
if [[ $(uname -m) != x86_64 ]]; then echo 'The validated runtime requires x86_64.' >&2; exit 1; fi
apt-get update -qq
apt-get install -y -qq ca-certificates curl xz-utils gnupg python3

node_version=22.23.1
if [[ ! -x /usr/local/bin/node ]] || [[ $(/usr/local/bin/node --version) != "v${node_version}" ]]; then
  node_archive="node-v${node_version}-linux-x64.tar.xz"
  node_download=$(mktemp -d)
  trap 'rm -rf "$node_download"' EXIT
  curl --fail --silent --show-error --location --retry 2 "https://nodejs.org/download/release/v${node_version}/${node_archive}" -o "${node_download}/${node_archive}"
  curl --fail --silent --show-error --location --retry 2 "https://nodejs.org/download/release/v${node_version}/SHASUMS256.txt" -o "${node_download}/SHASUMS256.txt"
  (cd "$node_download"; awk -v name="$node_archive" '$2 == name {print}' SHASUMS256.txt > selected.sha256; test -s selected.sha256; sha256sum --check selected.sha256)
  tar --extract --xz --file "${node_download}/${node_archive}" --directory /usr/local --strip-components=1 --no-same-owner
  rm -rf "$node_download"
  trap - EXIT
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  install -d -m 0755 /usr/share/keyrings
  curl --fail --silent --show-error --location --retry 2 https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  chmod 0644 /usr/share/keyrings/cloudflare-main.gpg
  printf '%s\n' 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' > /etc/apt/sources.list.d/cloudflared.list
  chmod 0644 /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq
  apt-get install -y -qq cloudflared
fi
id proofgate >/dev/null 2>&1 || useradd --system --home-dir /opt/proofgate --shell /usr/sbin/nologin proofgate
install -d -o proofgate -g proofgate -m 0750 /opt/proofgate
install -d -o proofgate -g proofgate -m 0700 /opt/proofgate/.proofgate

# A VM reboot must never restore stale databases or replenish an allowance.
if [[ -f /opt/proofgate/.proofgate/deployment/cloud-installed ]]; then
  echo 'Existing cloud deployment preserved; systemd owns service recovery.'
  exit 0
fi

# A metadata startup may run before scp; installation is ready, but nothing is exposed.
if [[ -f /opt/proofgate-transfer.tgz ]]; then
  # Integrator must have created a relative-path archive without symlinks or node_modules.
  python3 - <<'PY'
import tarfile
from pathlib import PurePosixPath
with tarfile.open('/opt/proofgate-transfer.tgz', 'r:gz') as archive:
    for item in archive.getmembers():
        path = PurePosixPath(item.name)
        if path.is_absolute() or '..' in path.parts or item.issym() or item.islnk() or not (item.isfile() or item.isdir()):
            raise SystemExit('Unsafe transfer archive refused')
PY
  tar --extract --gzip --file /opt/proofgate-transfer.tgz --directory /opt/proofgate --no-same-owner
  chown -R proofgate:proofgate /opt/proofgate
  find /opt/proofgate/.proofgate -type d -exec chmod 0700 {} +
  find /opt/proofgate/.proofgate -type f -exec chmod 0600 {} +
  chmod 0600 /opt/proofgate-transfer.tgz
  cd /opt/proofgate
  runuser -u proofgate -- /usr/local/bin/npm ci --omit=dev --ignore-scripts --no-audit --no-fund
  /bin/bash /opt/proofgate/scripts/gcp-judge-services.sh install
  install -o proofgate -g proofgate -m 0600 /dev/null /opt/proofgate/.proofgate/deployment/cloud-installed
else
  echo 'Runtime prerequisites ready. Upload private bundle, then rerun this script.'
fi
