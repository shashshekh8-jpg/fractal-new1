#!/bin/bash
echo "Initializing FRACTAL WASM Core Compilation..."

cd core-engine || exit

# 1. Output the raw build to the src directory so Webpack can bundle the JS bindings safely
wasm-pack build --target web --out-dir ../frontend/src/wasm --release

# 2. Ensure the public directory exists for the static asset
mkdir -p ../frontend/public/wasm

# 3. Copy ONLY the .wasm binary to the public folder for static fetching (Vercel Fix)
cp ../frontend/src/wasm/sentinel_protocol_core_bg.wasm ../frontend/public/wasm/

echo "WASM Core compiled. JS bindings in /src, Binary in /public. Ready for Vercel."
