# Specifiche Tecniche - Sistema POS PWA Multi-Dispositivo

## 1. Schema Dati JSON

### 1.1 Menu (`data/menu.json`)
```json
[
  {
    "id": "panino-1",
    "name": "Classic Burger",
    "description": "Manzo 100%, lattuga, pomodoro, formaggio cheddar",
    "price": 8.5,
    "categoryId": "cat-1",
    "available": true,
    "variants": [
      { "name": "Extra Formaggio", "priceDelta": 1.0 },
      { "name": "Bacon", "priceDelta": 1.5 },
      { "name": "Salsa BBQ", "priceDelta": 0.5 }
    ]
  },
  {
    "id": "fritto-1",
    "name": "Patatine Fritte",
    "description": "Patatine croccanti, sale marino",
    "price": 3.0,
    "categoryId": "cat-2",
    "available": true,
    "variants": []
  },
  {
    "id": "bevanda-1",
    "name": "Coca Cola 0.33L",
    "description": "Bevanda gassata",
    "price": 2.5,
    "categoryId": "cat-3",
    "available": true,
    "variants": []
  }
]
```

### 1.2 Tavoli (`data/tables.json`)
```json
[
  { "id": 1, "name": "Tavolo 1", "status": "free", "orders": [] },
  { "id": 2, "name": "Tavolo 2", "status": "free", "orders": [] },
  { "id": 3, "name": "Tavolo 3", "status": "free", "orders": [] },
  { "id": 4, "name": "Tavolo 4", "status": "free", "orders": [] },
  { "id": 5, "name": "Tavolo 5", "status": "free", "orders": [] },
  { "id": 6, "name": "Tavolo 6", "status": "free", "orders": [] },
  { "id": 7, "name": "Tavolo 7", "status": "free", "orders": [] },
  { "id": 8, "name": "Tavolo 8", "status": "free", "orders": [] },
  { "id": 9, "name": "Tavolo 9", "status": "free", "orders": [] },
  { "id": 10, "name": "Tavolo 10", "status": "free", "orders": [] },
  { "id": 11, "name": "Tavolo 11", "status": "free", "orders": [] },
  { "id": 12, "name": "Tavolo 12", "status": "free", "orders": [] }
]
```

### 1.3 Settings (`data/settings.json`)
```json
{
  "totem_enabled": true,
  "currency": "€",
  "tax_rate": 0.10
}
```

## 2. Modello Ordine (`order`)
```json
{
  "id": "ord-abcdef123456",
  "tableId": 1,
  "items": [
    {
      "id": "panino-1",
      "name": "Classic Burger",
      "price": 8.5,
      "quantity": 2,
      "variants": ["Extra Formaggio"],
      "notes": "Senza cipolla"
    }
  ],
  "total": 18.0,
  "status": "pending",
  "createdAt": "2026-08-18T12:34:56.000Z",
  "updatedAt": "2026-08-18T12:34:56.000Z"
}
```

## 3. Eventi WebSocket
| Evento | Payload | Descrizione |
|--------|---------|-------------|
| `NEW_ORDER` | `{ order }` | Una nuova comanda è stata creata. Tutti i client (KDS, admin) la ricevono.
| `STATUS_CHANGED` | `{ orderId, status }` | Aggiornamento dello stato della comanda.
| `TOTEM_STATE` | `{ enabled: true|false }` | Attiva o disattiva il totem, propagato a tutti i client.

## 4. Protocollo di Sincronizzazione Offline‑First
1. **Persistenza locale**: ogni interfaccia salva le richieste POST/PUT in `localStorage` con chiave `offlineQueue`.
2. **Rilevamento rete**: `window.addEventListener('online')` attiva il flush della coda.
3. **Flush**: per ogni elemento della coda viene effettuata la chiamata API originale. In caso di errore (es. 409) l'elemento viene rimosso o marcato come fallito.
4. **Idempotenza**: gli ID ordine sono generati client‑side (UUID) così il server può riconoscere duplicati.
5. **Conflitti**: se lo stato del tavolo è cambiato mentre il client era offline, il server restituisce il nuovo stato e il client aggiorna la UI.

## 5. Sicurezza & Autorizzazione (Future Scope)
- JWT per admin/manager.
- CORS limitato a domini di produzione.
- Rate‑limit su endpoint `/api/orders`.

---
*Documentazione generata da AIOPE.*
