"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// Helper to read JSON file
const readJSONFile = (filePath) => {
    const data = fs_1.default.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
};
// Helper to write JSON file
const writeJSONFile = (filePath, data) => {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
// Paths to data files
const MENU_PATH = path_1.default.join(__dirname, '..', 'data', 'menu.json');
const TABLES_PATH = path_1.default.join(__dirname, '..', 'data', 'tables.json');
const SETTINGS_PATH = path_1.default.join(__dirname, '..', 'data', 'settings.json');
// Load menu once at startup
let menuCache = null;
try {
    menuCache = readJSONFile(MENU_PATH);
}
catch (e) {
    console.error('Failed to load menu.json', e);
    menuCache = { categories: [] };
}
// In-memory order store (for simplicity, we'll use an array)
// In a real system, you'd use a database.
let orders = [];
let nextOrderId = 1;
// REST API Routes
// GET /api/menu
app.get('/api/menu', (req, res) => {
    res.json(menuCache);
});
// GET /api/tables
app.get('/api/tables', (req, res) => {
    try {
        const tablesData = readJSONFile(TABLES_PATH);
        res.json(tablesData);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to load tables' });
    }
});
// GET /api/settings
app.get('/api/settings', (req, res) => {
    try {
        const settingsData = readJSONFile(SETTINGS_PATH);
        res.json(settingsData);
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});
// POST /api/settings/totem
app.post('/api/settings/totem', (req, res) => {
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
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// POST /api/orders
app.post('/api/orders', (req, res) => {
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
app.patch('/api/orders/:id/status', (req, res) => {
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start HTTP server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});
// WebSocket Server
const wss = new ws_1.Server({ server });
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
