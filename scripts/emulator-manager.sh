#!/usr/bin/env bash

# Firebase Emulator Manager
# Manages lifecycle of Firebase Emulators for testing

set -e

EMULATOR_HOST="127.0.0.1"
FIRESTORE_PORT=8080
AUTH_PORT=9099
STORAGE_PORT=9199
FUNCTIONS_PORT=5001
UI_PORT=4000

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if emulators are running
is_emulator_running() {
    curl -s "http://${EMULATOR_HOST}:${FIRESTORE_PORT}" > /dev/null 2>&1
    return $?
}

# Start emulators
start_emulators() {
    if is_emulator_running; then
        log_warn "Emulators are already running"
        return 0
    fi

    log_info "Starting Firebase Emulators..."

    # Check if firebase-tools is installed
    if ! command -v firebase &> /dev/null; then
        log_error "firebase-tools not found. Installing..."
        npm install -g firebase-tools
    fi

    # Start emulators in the background
    firebase emulators:start --only auth,firestore,storage,functions > /tmp/firebase-emulator.log 2>&1 &
    EMULATOR_PID=$!

    log_info "Waiting for emulators to be ready..."

    # Wait for emulators to start (max 30 seconds)
    for i in {1..30}; do
        if is_emulator_running; then
            log_info "Emulators are ready!"
            log_info "Firestore: http://${EMULATOR_HOST}:${FIRESTORE_PORT}"
            log_info "Auth: http://${EMULATOR_HOST}:${AUTH_PORT}"
            log_info "Storage: http://${EMULATOR_HOST}:${STORAGE_PORT}"
            log_info "Functions: http://${EMULATOR_HOST}:${FUNCTIONS_PORT}"
            log_info "UI: http://localhost:${UI_PORT}"
            echo "${EMULATOR_PID}" > /tmp/firebase-emulator.pid
            return 0
        fi
        sleep 1
    done

    log_error "Emulators failed to start. Check /tmp/firebase-emulator.log"
    return 1
}

# Stop emulators
stop_emulators() {
    if [ -f /tmp/firebase-emulator.pid ]; then
        PID=$(cat /tmp/firebase-emulator.pid)
        if ps -p $PID > /dev/null 2>&1; then
            log_info "Stopping emulators (PID: $PID)..."
            kill $PID
            rm /tmp/firebase-emulator.pid
            log_info "Emulators stopped"
        else
            log_warn "Emulator process not found"
            rm /tmp/firebase-emulator.pid
        fi
    else
        # Try to find and kill firebase emulator processes
        pkill -f "firebase.*emulators:start" || log_warn "No emulator processes found"
    fi
}

# Restart emulators
restart_emulators() {
    log_info "Restarting emulators..."
    stop_emulators
    sleep 2
    start_emulators
}

# Check emulator status
status() {
    if is_emulator_running; then
        log_info "Emulators are running"
        log_info "Firestore: http://${EMULATOR_HOST}:${FIRESTORE_PORT}"
        log_info "Auth: http://${EMULATOR_HOST}:${AUTH_PORT}"
        log_info "UI: http://localhost:${UI_PORT}"
        return 0
    else
        log_warn "Emulators are not running"
        return 1
    fi
}

# Clear emulator data
clear_data() {
    if is_emulator_running; then
        log_info "Clearing emulator data..."
        curl -s -X DELETE "http://${EMULATOR_HOST}:${FIRESTORE_PORT}/emulator/v1/projects/demo-sierra-painting-test/databases/(default)/documents" > /dev/null
        log_info "Data cleared"
    else
        log_warn "Emulators are not running. Nothing to clear."
    fi
}

# Export emulator data
export_data() {
    local export_path="${1:-./firebase-data}"
    if is_emulator_running; then
        log_info "Exporting emulator data to ${export_path}..."
        firebase emulators:export "${export_path}"
        log_info "Data exported"
    else
        log_error "Emulators must be running to export data"
        return 1
    fi
}

# Main command handler
case "${1:-start}" in
    start)
        start_emulators
        ;;
    stop)
        stop_emulators
        ;;
    restart)
        restart_emulators
        ;;
    status)
        status
        ;;
    clear)
        clear_data
        ;;
    export)
        export_data "$2"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|clear|export [path]}"
        exit 1
        ;;
esac
