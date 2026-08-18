import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as WSServer } from 'ws';
import dotenv from 'dotenv';
import nano from 'nano';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Specific route for waiter interface
app.get('/waiter', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/waiter/index.html'));
});

// Helper to read JSON files
function readJsonFile<T>(filePath: path.PathOrFileDescriptor): T {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data) as T;
}

// Helper to write JSON files
function writeJsonFile(filePath: path.PathOrFileDescriptor, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Broadcast helper
let wss: WSServer;
function broadcast(data: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API routes
app.get('/api/menu', (req: Request, res: Response) => {
  try {
    const menu = readJsonFile(path.join(__dirname, '../data/menu.json'));
    res.json(menu);
  } catch (e) {
    console.error('Error reading menu.json', e);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

app.get('/api/tables', (req: Request, res: Response) => {
  try {
    const tables = readJsonFile(path.join(__dirname, '../data/tables.json'));
    res.json(tables);
  } catch (e) {
    console.error('Error reading tables.json', e);
    res.status(500).json({ error: 'Failed to load tables' });
  }
});

app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = readJsonFile(path.join(__dirname, '../data/settings.json'));
    res.json(settings);
  } catch (e) {
    console.error('Error reading settings.json', e);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings/totem', (req: Request, res: Response) => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const settings = readJsonFile(settingsPath);
    settings.totem_enabled = !settings.totem_enabled;
    writeJsonFile(settingsPath, settings);
    // Broadcast the update
    broadcast({ type: 'SETTINGS_UPDATE', payload: settings });
    res.json({ success: true, totem_enabled: settings.totem_enabled });
  } catch (e) {
    console.error('Error toggling totem', e);
    res.status(500).json({ error: 'Failed to toggle totem' });
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  const payload = req.body;
  try {
    // In a real app, we would save to a database. For now, we just acknowledge.
    // Broadcast new order to WS clients
    broadcast({ type: 'NEW_ORDER', payload });
    res.json({ result: 'order_received' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'order_failed' });
  }
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // In a real app, update the order in the database and broadcast.
    // For now, we just acknowledge and broadcast a status change.
    // We don't have the order object, so we broadcast a minimal payload.
    broadcast({ type: 'STATUS_CHANGED', payload: { id, status } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'status_update_failed' });
  }
});

// Simple health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Backend listening on port ${process.env.PORT || 3000}`);
});

// WebSocket for real‑time updates
wss = new WSServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WS');
  // Send current state on connection
  try {
    const tables = readJsonFile(path.join(__dirname, '../data/tables.json'));
    const settings = readJsonFile(path.join(__dirname, '../data/settings.json'));
    ws.send(JSON.stringify({ type: 'INIT_STATE', payload: { tables, settings } }));
  } catch (e) {
    console.error('Error sending initial state', e);
  }

  ws.on('message', (msg) => {
    console.log('Received WS message:', msg.toString());
    // We don't expect messages from clients for now, but we could handle them.
    // Echo back for now
    ws.send(JSON.stringify({ echo: msg.toString() }));
  });
});