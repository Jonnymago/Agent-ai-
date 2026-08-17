import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as WSServer } from 'ws';
import dotenv from 'dotenv';
import nano from 'nano';
import { ordersRouter } from './orders';
import { authMiddleware } from './auth';
import { swaggerSetup } from './swagger';
import { syncRouter } from './sync';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login (demo)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    const token = generateToken({ userId: 'admin', role: 'admin' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Bad credentials' });
});

// Protected routes
app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/sync', authMiddleware, syncRouter);

// Swagger UI
swaggerSetup(app);

// WebSocket echo (demo)
const wss = new WSServer({ port: 8080 });
wss.on('connection', (ws) => {
  ws.on('message', (msg) => ws.send(`echo: ${msg}`));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
