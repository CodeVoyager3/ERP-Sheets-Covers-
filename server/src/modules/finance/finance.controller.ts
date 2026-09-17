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

export const getSummary = async (req: Request, res: Response) => {
  try {
    const summary = await financeService.getLedgerSummary();
    res.status(200).json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};