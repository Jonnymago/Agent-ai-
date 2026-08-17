import express, { Request, Response } from express;
import cors from cors;
import { Server as WSServer } from ws;
import dotenv from dotenv;
import nano from nano;
import rateLimit from express-rate-limit;
import logger from ./logger;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting (basic DoS protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // max 100 requests per window per IP
  handler: (req: Request, res: Response) => {
    logger.warn(Rate