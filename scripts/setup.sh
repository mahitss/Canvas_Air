#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "==============================================="
echo "VisionCanvas AI: Bootstrapping Developer Env"
echo "==============================================="

# 1. Check node and npm
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed." >&2
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed." >&2
    exit 1
fi

echo "✓ Node.js $(node -v) detected."
echo "✓ npm $(npm -v) detected."

# 2. Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Error: Python is not installed." >&2
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi
echo "✓ Python detected: using $PYTHON_CMD"

# 3. Installing root Node workspaces
echo "Installing monorepo JS dependencies..."
npm install

# 4. Compiling packages
echo "Building shared packages (@visioncanvas/tsconfig, @visioncanvas/core, @visioncanvas/protocol)..."
npm run build --workspace=@visioncanvas/core
npm run build --workspace=@visioncanvas/protocol

# 5. Setting up Python venv for AI Services
echo "Setting up Python virtual environment in apps/ai/venv..."
cd apps/ai
$PYTHON_CMD -m venv venv
source venv/bin/activate || source venv/Scripts/activate

echo "Installing AI Service Python requirements..."
pip install --upgrade pip
pip install -r requirements.txt
cd ../..

echo "==============================================="
echo "✓ VisionCanvas AI Bootstrap Complete!"
echo "To start services:"
echo "  - Front-end client: npm run dev:web"
echo "  - Sync backend: npm run dev:server"
echo "  - AI Services: npm run dev:ai"
echo "==============================================="
