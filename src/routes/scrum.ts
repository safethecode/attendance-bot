import { Router, Request, Response } from 'express';
import { googleChatService } from '../services/googleChat';

const router = Router();

router.post('/daily-scrum', async (req: Request, res: Response) => {
  try {
    await googleChatService.sendDailyScrumReminder();
    res.status(200).json({ success: true, message: 'Daily scrum reminder sent' });
  } catch (error) {
    console.error('Error sending daily scrum reminder:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
