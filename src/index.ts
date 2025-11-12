import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import { config, validateConfig } from './config/env';
import scrumRouter from './routes/scrum';
import attendanceRouter from './routes/attendance';

validateConfig();

const app: Express = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Google Chat Bot API',
    endpoints: {
      dailyScrum: 'POST /api/daily-scrum',
      attendance: 'POST /api/attendance/bot',
    },
  });
});

app.use('/api', scrumRouter);
app.use('/api/attendance', attendanceRouter);

const port = config.server.port;

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📋 Daily Scrum endpoint: http://localhost:${port}/api/daily-scrum`);
  console.log(`👥 Attendance Bot endpoint: http://localhost:${port}/api/attendance/bot`);
});
