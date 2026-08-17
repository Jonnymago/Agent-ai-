#!/usr/bin/env bash
set -e

# -------------------------------------------------
#  Project bootstrap script – installs all deps
# -------------------------------------------------

# 1. System packages (Node, Java, Android SDK)
if ! command -v node >/dev/null; then
  echo "Installing Node via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install 20
fi

# 2. Java (OpenJDK 17) – required for Gradle/Kotlin
if ! command -v java >/dev/null; then
  echo "Installing OpenJDK 17..."
  sudo apt-get update -y && sudo apt-get install -y openjdk-17-jdk
fi

# 3. Gradle wrapper (if not present)
if [ ! -f ./mobile/gradlew ]; then
  echo "Generating Gradle wrapper..."
  cd mobile && gradle wrapper && cd ..
fi

# 4. Backend deps (Node)
cd backend && npm ci && cd ..

# 5. KDS web deps (React/Vite)
cd kds-web && npm ci && cd ..

# 6. Docker compose for CouchDB (optional)
if [ -f docker-compose.yml ]; then
  echo "Starting CouchDB via Docker..."
  docker compose up -d couchdb
fi

echo "Setup completed. Use ./scripts/start.sh to launch services."
