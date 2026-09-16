import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// global middlewares
app.use(cors());
app.use(express.json());

app.use('/api',routes);

app.use(errorHandler); // global error handler

export default app;