#!/bin/bash
set -e

echo "Building frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

echo "Installing API dependencies..."
cd api
npm install
cd ..

echo "Build complete!"
