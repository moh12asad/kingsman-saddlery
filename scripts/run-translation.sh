#!/bin/bash
# Wrapper script to run translation script from project root
# This ensures the script runs from the correct directory

cd "$(dirname "$0")/.."
cd server
node ../scripts/translate-fields.mjs "$@"

