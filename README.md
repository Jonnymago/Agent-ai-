# Totem POS – Self‑Ordering Platform

## Overview
A modular, offline‑first POS system for food‑service businesses.
- **Backend**: Node.js 20, TypeScript, Express, CouchDB replication.
- **Mobile**: Kotlin Multiplatform (Android/iOS) – order entry, client UI.
- **KDS**: React 18 PWA – kitchen display on any browser/TV.
- **Features**: Full offline transaction queue, zero‑fee pricing model, theme engine, plugin marketplace, AI analytics, PCI‑DSS‑compatible security.

## Repository Structure
```
Agent-ai-
├─ backend/          # Node/TS server
├─ mobile/           # KMM source
├─ kds-web/          # React PWA for kitchen display
├─ docs/             # Architecture docs, API spec
├─ scripts/          # Helper scripts (setup, lint, test)
└─ .github/workflows # CI pipelines
```

## Getting Started
```bash
# Already cloned
cd Agent-ai-
./scripts/setup.sh   # install deps for backend & mobile
```

See `docs/README.md` for detailed setup.
