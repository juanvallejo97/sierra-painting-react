#!/bin/bash

# Firebase Emulator Startup Script
# Ensures clean startup with proper port management

set -e

PROJECT_ID="sierra-painting-staging"
EMULATOR_PORTS="4000 4400 4500 5001 8080 9099 9150 9199"

echo "🧹 Cleaning up existing Firebase emulator processes..."

# Kill any existing emulator processes
for PORT in $EMULATOR_PORTS; do
  PID=$(lsof -t -i:$PORT 2>/dev/null || true)
  if [ ! -z "$PID" ]; then
    echo "  ⚡ Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

# Also kill any firebase emulator processes by name
pkill -f "firebase emulators:start" 2>/dev/null || true
pkill -f "firebase-tools" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Verify ports are free
echo "🔍 Verifying ports are free..."
for PORT in $EMULATOR_PORTS; do
  if lsof -t -i:$PORT >/dev/null 2>&1; then
    echo "  ❌ Port $PORT is still in use!"
    lsof -i:$PORT
    exit 1
  fi
done

echo "✅ All ports are free"
echo ""
echo "🚀 Starting Firebase Emulators..."
echo "   Project: $PROJECT_ID"
echo "   Emulators: auth, firestore, storage"
echo "   UI: http://localhost:4000"
echo ""

# Start emulators
npx firebase emulators:start \
  --only auth,firestore,storage \
  --project $PROJECT_ID \
  --import=./emulator-data \
  --export-on-exit=./emulator-data
