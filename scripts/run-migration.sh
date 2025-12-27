#!/bin/bash
# Wrapper script to run migration from server directory
# This ensures firebase-admin can be found

cd "$(dirname "$0")/../server" || exit 1
node ../scripts/migrate-translations.mjs "$@"

