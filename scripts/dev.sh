#!/bin/bash
set -Eeuo pipefail


PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

# macOS often binds 5000 to AirPlay Receiver; fall back so dev can start.
if [[ "$(uname -s)" == "Darwin" ]] && lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is in use (often macOS AirPlay Receiver); using 3000 for dev."
  PORT=3000
fi
DEPLOY_RUN_PORT="${PORT}"

cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local pids
    if [[ "$(uname -s)" == "Darwin" ]]; then
      pids=$(lsof -tiTCP:"${DEPLOY_RUN_PORT}" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | xargs echo 2>/dev/null || true)
    else
      pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    fi
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    if [[ "$(uname -s)" == "Darwin" ]]; then
      pids=$(lsof -tiTCP:"${DEPLOY_RUN_PORT}" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | xargs echo 2>/dev/null || true)
    else
      pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    fi
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

echo "Clearing port ${PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${PORT} for dev..."

PORT=$PORT pnpm tsx watch src/server.ts
