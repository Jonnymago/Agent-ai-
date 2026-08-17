import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as WSServer } from 'ws';
import dotenv from 'dotenv';
import nano from 'nano';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder sync endpoint (POST body will be stored in CouchDB)
app.post('/sync', async (req: Request, res: Response) => {
  const payload = req.body;
  try {
    const couch = nano(process.env.COUCHDB_URL || 'http://admin:admin@127.0.0.1:5984');
    const db = couch.db.use('totem_sync');
    await db.insert(payload);
    res.json({ result: 'stored' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'sync_failed' });
  }
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Backend listening on port ${process.env.PORT || 3000}`);
});

// WebSocket for real‑time order push
const wss = new WSServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WS');
  ws.on('message', (msg) => {
    console.log('Received WS message:', msg.toString());
    // Echo back for now
    ws.send(JSON.stringify({ echo: msg.toString() }));
  });
});
