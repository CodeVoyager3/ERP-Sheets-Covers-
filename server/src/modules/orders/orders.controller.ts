import { Request, Response } from 'express';
import * as ordersService from './orders.service';

export const create = async (req: Request, res: Response) => {
  try {
    const { customerName, items } = req.body;
    
    // auth middleware attaches decoded token to req.user
    const createdById = (req as any).user.userId; 

    const order = await ordersService.createOrder(customerName, createdById, items);
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const confirm = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // const { id } = req.params; assuring that clean string is parsed so typecasting it as string
    const userId = (req as any).user.userId; // Extracted from JWT

    const confirmedOrder = await ordersService.confirmOrder(id, userId);
    res.status(200).json({ message: 'Order confirmed successfully', order: confirmedOrder });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};