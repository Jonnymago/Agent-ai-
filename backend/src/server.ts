import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as WSServer } from 'ws';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper to read JSON file
const readJSONFile = (filePath: string): any => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

// Helper to write JSON file
const writeJSONFile = (filePath: string, data: any): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Paths to data files
const MENU_PATH = path.join(__dirname, '..', 'data', 'menu.json');
const TABLES_PATH = path.join(__dirname, '..', 'data', 'tables.json');
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

// Load menu once at startup
let menuCache = null;
try {
  menuCache = readJSONFile(MENU_PATH);
} catch (e) {
  console.error('Failed to load menu.json', e);
  menuCache = { categories: [] };
}

// In-memory order store (for simplicity, we'll use an array)
// In a real system, you'd use a database.
let orders: any[] = [];
let nextOrderId = 1;

// REST API Routes

// GET /api/menu
app.get('/api/menu', (req: Request, res: Response) => {
  res.json(menuCache);
});

// GET /api/tables
app.get('/api/tables', (req: Request, res: Response) => {
  try {
    const tablesData = readJSONFile(TABLES_PATH);
    res.json(tablesData);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load tables' });
  }
});

// GET /api/settings
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settingsData = readJSONFile(SETTINGS_PATH);
    res.json(settingsData);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// POST /api/settings/totem
app.post('/api/settings/totem', (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload: expected boolean enabled' });
  }
  try {
    const settings = readJSONFile(SETTINGS_PATH);
    settings.totem_enabled = enabled;
    writeJSONFile(SETTINGS_PATH, settings);
    // Broadcast totem state change via WebSocket
    const totemEvent = JSON.stringify({ type: 'TOTEM_STATE', enabled });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(totemEvent);
      }
    });
    res.json({ success: true, totem_enabled: enabled });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/orders
app.post('/api/orders', (req: Request, res: Response) => {
  const { tableId, items } = req.body;
  if (!tableId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order: tableId and non-empty items array required' });
  }
  // Validate items against menu? We'll skip for now but could be added.
  const order = {
    id: nextOrderId++,
    tableId,
    items,
    status: 'in_attesa', // initial status
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  // Broadcast new order via WebSocket
  const newOrderEvent = JSON.stringify({ type: 'NEW_ORDER', order });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(newOrderEvent);
    }
  });
  res.status(201).json(order);
});

// PATCH /api/orders/:id/status
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const validStatuses = ['in_attesa', 'in_preparazione', 'pronto', 'completato'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of ${validStatuses.join(', ')}` });
  }
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const oldStatus = orders[orderIndex].status;
  orders[orderIndex].status = status;
  orders[orderIndex].updatedAt = new Date().toISOString();
  // Broadcast status change via WebSocket
  const statusEvent = JSON.stringify({ type: 'STATUS_CHANGED', orderId, status });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statusEvent);
    }
  });
  res.json({ success: true, order: orders[orderIndex] });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start HTTP server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

// WebSocket Server
const wss = new WSServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WS');
  ws.on('message', (msg) => {
    console.log('Received WS message:', msg.toString());
    // Echo back for now (or handle client messages if needed)
    ws.send(JSON.stringify({ echo: msg.toString() }));
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

