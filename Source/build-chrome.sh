#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
npm ci --ignore-scripts
npm run build
python3 package-halo.py
printf 'Chrome package: ../Chrome\n'
