import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import { config, validateConfig } from './config/env';
import attendanceRouter from './routes/attendance';

validateConfig();

const app: Express = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Google Chat Bot API',
    endpoints: {
      attendance: 'POST /api/attendance/bot',
      health: 'GET /health',
    },
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/attendance', attendanceRouter);

const port = config.server.port;

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`👥 Attendance Bot endpoint: http://localhost:${port}/api/attendance/bot`);
});
