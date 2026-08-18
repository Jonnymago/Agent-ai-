import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as WSServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import nano from 'nano';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

dotenv.config();

const app = express();
const __dirname = path.resolve(); // directory of the running script (dist when built)
const appRoot = path.resolve(__dirname, '..'); // backend root

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(appRoot, 'public')));

// Specific route for waiter interface
app.get('/waiter', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'waiter', 'index.html'));
});

// Specific route for kds interface
app.get('/kds', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'kds', 'index.html'));
});

// Specific route for admin interface
app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'admin', 'index.html'));
});

// Specific route for totem interface
app.get('/totem', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'totem', 'index.html'));
});

// Specific route for menu QR interface (same as totem)
app.get('/menu', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'totem', 'index.html'));
});

// Specific route for admin QR print
app.get('/admin/qr-print', (req: Request, res: Response) => {
  res.sendFile(path.join(appRoot, 'public', 'admin', 'qr-print.html'));
});

// Helper to read JSON files
function readJsonFile<T>(filePath: string): T {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data) as T;
}

// Helper to write JSON files
function writeJsonFile(filePath: string, data: any): void {
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
    const menu = readJsonFile<any[]>(path.join(appRoot, 'data', 'menu.json'));
    res.json(menu);
  } catch (e) {
    console.error('Error reading menu.json', e);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

app.get('/api/tables', (req: Request, res: Response) => {
  try {
    const tables = readJsonFile<any[]>(path.join(appRoot, 'data', 'tables.json'));
    res.json(tables);
  } catch (e) {
    console.error('Error reading tables.json', e);
    res.status(500).json({ error: 'Failed to load tables' });
  }
});

app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = readJsonFile<{ totem_enabled: boolean }>(path.join(appRoot, 'data', 'settings.json'));
    res.json(settings);
  } catch (e) {
    console.error('Error reading settings.json', e);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings/totem', (req: Request, res: Response) => {
  try {
    const settingsPath = path.join(appRoot, 'data', 'settings.json');
    const settings = readJsonFile<{ totem_enabled: boolean }>(settingsPath);
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

// NEW: API to generate QR codes for tables
app.get('/api/tables/qr-codes', async (req: Request, res: Response) => {
  try {
    const tables = readJsonFile<any[]>(path.join(appRoot, 'data', 'tables.json'));
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol; // 'http' or 'https'
    const baseUrl = `${protocol}://${host}`;

    const qrCodes = await Promise.all(
      tables.map(async (table) => {
        const targetUrl = `${baseUrl}/menu?table=${table.id}`;
        const qrCodeDataUrl = await QRCode.toDataURL(targetUrl);
        return {
          tableId: table.id,
          tableName: table.name || `Tavolo ${table.id}`,
          targetUrl,
          qrCodeDataUrl,
        };
      })
    );

    res.json(qrCodes);
  } catch (e) {
    console.error('Error generating QR codes', e);
    res.status(500).json({ error: 'Failed to generate QR codes' });
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

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected via WS');
  // Send current state on connection
  try {
    const tables = readJsonFile<any[]>(path.join(appRoot, 'data', 'tables.json'));
    const settings = readJsonFile<{ totem_enabled: boolean }>(path.join(appRoot, 'data', 'settings.json'));
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
