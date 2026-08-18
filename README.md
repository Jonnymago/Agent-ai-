# Sistema POS PWA Multi-Dispositivo Offline-First

## Panoramica
Il progetto è un sistema di Point‑of‑Sale (POS) basato su Progressive Web App (PWA) **offline‑first**. Supporta più interfacce:
- **Totem self‑service** (kiosk touch) per ordinare direttamente dal cliente.
- **Monitor cucina (KDS)** per la gestione in tempo reale delle comande.
- **Dashboard Cassa/Master** per il personale di sala e la gestione dei tavoli.
- **Interfaccia cameriere** (waiter) per la presa d'ordine tradizionale.
- **Menu QR**: URL `/menu?table=N` per ordinare dal tavolo tramite QR code.

## Architettura tecnica
- **Backend**: Node.js + Express, scritto in TypeScript.
- **WebSocket**: libreria `ws` per push in tempo reale di eventi (`NEW_ORDER`, `STATUS_CHANGED`, `TOTEM_STATE`).
- **Persistenza**: file JSON statici (`data/menu.json`, `data/tables.json`, `data/settings.json`) usati come data‑store locale; possibilità di integrazione con CouchDB.
- **Frontend**: HTML5 + CSS (dark‑mode, touch‑friendly) + JavaScript vanilla per ogni interfaccia (`waiter`, `kds`, `admin`, `totem`).
- **Process manager**: PM2 con file `ecosystem.config.js`.
- **QR Code**: libreria `qrcode` per generare dinamicamente i codici QR dei tavoli.

## Mappa degli endpoint API
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/menu` | Restituisce l’intero catalogo prodotti |
| GET | `/api/tables` | Lista dei tavoli con stato corrente |
| GET | `/api/settings` | Configurazione globale (es. `totem_enabled`) |
| POST | `/api/settings/totem` | Toggle on/off del totem |
| POST | `/api/orders` | Crea una nuova comanda |
| PATCH | `/api/orders/:id/status` | Aggiorna lo stato di una comanda |
| GET | `/api/tables/qr-codes` | Genera QR code per tutti i tavoli |

## Route frontend PWA
- `/waiter` → interfaccia cameriere.
- `/kds` → monitor cucina.
- `/admin` → dashboard cassa/master.
- `/totem` → kiosk self‑service.
- `/menu?table=N` → menu per QR code tavolo.
- `/admin/qr-print` → stampa etichette QR per i tavoli.

## Installazione & Avvio
```bash
cd Agent-ai-/backend
npm install               # installa dipendenze
npm run build             # compila TypeScript → dist/
npm start                 # avvia server (porta 3000)
# oppure con PM2 (produzione)
npm run start:pm2        # avvia con ecosystem.config.js
npm run logs              # visualizza log PM2
```

## Deploy
- **LAN locale**: avviare il backend su una macchina nella rete (es. Raspberry Pi) e accedere via `http://<IP>:3000`.
- **Cloud** (Render, Railway, Fly.io, etc.):
  1. Impostare variabili d’ambiente `PORT=3000` e `NODE_ENV=production`.
  2. Configurare il servizio per eseguire `npm run build && npm start` o `npm run start:pm2`.
  3. Aprire le porte HTTP/HTTPS.

## Note
- Il progetto è **offline‑first**: le interfacce salvano ordini in `localStorage` quando la rete è assente e li inviano al backend al ripristino.
- Il WebSocket mantiene sincronizzato lo stato dei tavoli e delle comande in tempo reale.
- UI mobile‑first, dark‑mode, componenti touch‑friendly (target minimo 48 px).

---
*Created by AIOPE – personal intelligent agent.*
