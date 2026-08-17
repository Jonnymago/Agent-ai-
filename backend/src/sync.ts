import { Router, Request, Response } from 'express';
import PouchDB from 'pouchdb-node';
import { authMiddleware } from './auth';

// Local PouchDB instance (used for offline replication on server side)
const localDb = new PouchDB('local_sync_db');
// Remote CouchDB (environment variable)
const remoteUrl = process.env.COUCHDB_URL || 'http://admin:admin@127.0.0.1:5984/totem_sync';
const remoteDb = new PouchDB(remoteUrl);

/**
 * POST /api/sync
 * Body: { docs: Array<any> } – docs from client (new/updated)
 * Response: replication result
 */
export const syncRouter = Router();

syncRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const clientDocs = req.body?.docs;
  if (!Array.isArray(clientDocs)) {
    return res.status(400).json({ error: 'Invalid payload, expected docs array' });
  }
  try {
    // 1️⃣ Push client docs to remote CouchDB (bulk docs)
    const pushResult = await remoteDb.bulkDocs(clientDocs);

    // 2️⃣ Pull latest remote changes into local PouchDB (replicate)
    const pullResult = await localDb.replicate.from(remoteDb, {
      // only new revisions
      since: 'now',
    });

    // 3️⃣ Return combined result (client can store pullResult.docs if needed)
    return res.json({ pushResult, pullResult });
  } catch (e: any) {
    console.error('Sync error', e);
    return res.status(500).json({ error: e.message || 'Sync failed' });
  }
});
