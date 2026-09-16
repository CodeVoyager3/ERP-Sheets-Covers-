import { Request, Response } from 'express';
import * as inventoryService from './inventory.service';
//fetch stock
export const getStock = async (req: Request, res: Response) => {
  try {
    const stockLevels = await inventoryService.getInventoryStockLevels();
    res.status(200).json(stockLevels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// restocking
export const stockIn = async (req: Request, res: Response) => {
  try {
    const { productId, quantity, note } = req.body;
    const userId = (req as any).user.userId; // Extracted from JWT

    const entry = await inventoryService.addStockIn(productId, Number(quantity), userId, note);
    res.status(201).json({ message: 'Stock added successfully', entry });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};