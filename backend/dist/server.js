"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const qrcode_1 = __importDefault(require("qrcode"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const __dirname = path_1.default.resolve(); // directory of the running script (dist when built)
const appRoot = path_1.default.resolve(__dirname, '..'); // backend root
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from public directory
app.use(express_1.default.static(path_1.default.join(appRoot, 'public')));
// Specific route for waiter interface
app.get('/waiter', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'waiter', 'index.html'));
});
// Specific route for kds interface
app.get('/kds', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'kds', 'index.html'));
});
// Specific route for admin interface
app.get('/admin', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'admin', 'index.html'));
});
// Specific route for totem interface
app.get('/totem', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'totem', 'index.html'));
});
// Specific route for menu QR interface (same as totem)
app.get('/menu', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'totem', 'index.html'));
});
// Specific route for admin QR print
app.get('/admin/qr-print', (req, res) => {
    res.sendFile(path_1.default.join(appRoot, 'public', 'admin', 'qr-print.html'));
});
// Helper to read JSON files
function readJsonFile(filePath) {
    const data = fs_1.default.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}
// Helper to write JSON files
function writeJsonFile(filePath, data) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
// Broadcast helper
let wss;
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    });
}
// API routes
app.get('/api/menu', (req, res) => {
    try {
        const menu = readJsonFile(path_1.default.join(appRoot, 'data', 'menu.json'));
        res.json(menu);
    }
    catch (e) {
        console.error('Error reading menu.json', e);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});
app.get('/api/tables', (req, res) => {
    try {
        const tables = readJsonFile(path_1.default.join(appRoot, 'data', 'tables.json'));
        res.json(tables);
    }
    catch (e) {
        console.error('Error reading tables.json', e);
        res.status(500).json({ error: 'Failed to load tables' });
    }
});
app.get('/api/settings', (req, res) => {
    try {
        const settings = readJsonFile(path_1.default.join(appRoot, 'data', 'settings.json'));
        res.json(settings);
    }
    catch (e) {
        console.error('Error reading settings.json', e);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});
app.post('/api/settings/totem', (req, res) => {
    try {
        const settingsPath = path_1.default.join(appRoot, 'data', 'settings.json');
        const settings = readJsonFile(settingsPath);
        settings.totem_enabled = !settings.totem_enabled;
        writeJsonFile(settingsPath, settings);
        // Broadcast the update
        broadcast({ type: 'SETTINGS_UPDATE', payload: settings });
        res.json({ success: true, totem_enabled: settings.totem_enabled });
    }
    catch (e) {
        console.error('Error toggling totem', e);
        res.status(500).json({ error: 'Failed to toggle totem' });
    }
});
app.post('/api/orders', async (req, res) => {
    const payload = req.body;
    try {
        // In a real app, we would save to a database. For now, we just acknowledge.
        // Broadcast new order to WS clients
        broadcast({ type: 'NEW_ORDER', payload });
        res.json({ result: 'order_received' });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'order_failed' });
    }
});
app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        // In a real app, update the order in the database and broadcast.
        // For now, we just acknowledge and broadcast a status change.
        // We don't have the order object, so we broadcast a minimal payload.
        broadcast({ type: 'STATUS_CHANGED', payload: { id, status } });
        res.json({ success: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'status_update_failed' });
    }
});
// NEW: API to generate QR codes for tables
app.get('/api/tables/qr-codes', async (req, res) => {
    try {
        const tables = readJsonFile(path_1.default.join(appRoot, 'data', 'tables.json'));
        const host = req.get('host') || 'localhost:3000';
        const protocol = req.protocol; // 'http' or 'https'
        const baseUrl = `${protocol}://${host}`;
        const qrCodes = await Promise.all(tables.map(async (table) => {
            const targetUrl = `${baseUrl}/menu?table=${table.id}`;
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(targetUrl);
            return {
                tableId: table.id,
                tableName: table.name || `Tavolo ${table.id}`,
                targetUrl,
                qrCodeDataUrl,
            };
        }));
        res.json(qrCodes);
    }
    catch (e) {
        console.error('Error generating QR codes', e);
        res.status(500).json({ error: 'Failed to generate QR codes' });
    }
});
// Simple health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Backend listening on port ${process.env.PORT || 3000}`);
});
// WebSocket for real‑time updates
wss = new ws_1.Server({ server });
wss.on('connection', (ws) => {
    console.log('Client connected via WS');
    // Send current state on connection
    try {
        const tables = readJsonFile(path_1.default.join(appRoot, 'data', 'tables.json'));
        const settings = readJsonFile(path_1.default.join(appRoot, 'data', 'settings.json'));
        ws.send(JSON.stringify({ type: 'INIT_STATE', payload: { tables, settings } }));
    }
    catch (e) {
        console.error('Error sending initial state', e);
    }
    ws.on('message', (msg) => {
        console.log('Received WS message:', msg.toString());
        // We don't expect messages from clients for now, but we could handle them.
        // Echo back for now
        ws.send(JSON.stringify({ echo: msg.toString() }));
    });
});
