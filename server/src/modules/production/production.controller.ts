import { Request, Response } from 'express';
import * as productionService from './production.service';

export const create = async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const userId = (req as any).user.userId;

    const workOrder = await productionService.createWorkOrder(productId, Number(quantity), userId);
    res.status(201).json({ message: 'Work order created successfully', workOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const workOrders = await productionService.getWorkOrders();
    res.status(200).json(workOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const complete = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.userId;

    const workOrder = await productionService.completeWorkOrder(id, userId);
    res.status(200).json({ message: 'Work order completed and stock added', workOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const advance = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { note } = req.body;
    const userId = (req as any).user.userId;

    const job = await productionService.advanceJobStage(id, userId, note);
    res.status(200).json({ message: 'Job stage advanced successfully', job });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getJobDetail = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const job = await productionService.getJobById(id);
    if (!job) return res.status(404).json({ error: 'Production job not found' });
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};