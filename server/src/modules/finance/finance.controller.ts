import { Request, Response } from 'express';
import * as financeService from './finance.service';

export const getLedger = async (req: Request, res: Response) => {
  try {
    const entries = await financeService.getLedgerEntries();
    res.status(200).json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};