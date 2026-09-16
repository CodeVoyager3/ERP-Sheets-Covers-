import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

// global middlewares
app.use(cors());
app.use(express.json());

app.use('/api',routes);

export default app;