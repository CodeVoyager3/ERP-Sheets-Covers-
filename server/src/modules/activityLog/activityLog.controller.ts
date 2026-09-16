import { Request, Response } from 'express';
import * as activityLogService from './activityLog.service';

export const getLogs = async (req: Request, res: Response) => {
  try {
    const logs = await activityLogService.getActivityLogs();
    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};