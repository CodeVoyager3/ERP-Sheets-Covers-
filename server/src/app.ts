import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// global middlewares
// CORS_ORIGIN: comma-separated list of allowed origins (e.g. https://your-app.vercel.app,https://yourdomain.com)
// unset => allow all (dev)
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api',routes);

app.use(errorHandler); // global error handler

export default app;