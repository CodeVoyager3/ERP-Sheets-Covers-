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

// fetch all orders
export const getAll = async (req: Request, res: Response) => {
  try {
    const orders = await ordersService.getAllOrders();
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const dispatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.userId;
    const order = await ordersService.dispatchOrder(id, userId);
    res.status(200).json({ message: 'Order dispatched', order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deliver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.userId;
    const order = await ordersService.deliverOrder(id, userId);
    res.status(200).json({ message: 'Order delivered', order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.userId;
    const order = await ordersService.cancelOrder(id, userId);
    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await ordersService.getOrderById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};