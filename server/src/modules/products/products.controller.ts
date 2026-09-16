import { Request, Response } from 'express';
import * as productsService from './products.service';
//product creation logic
export const create = async (req: Request, res: Response) => {
  try {
    const { sku, name, price } = req.body;
    const product = await productsService.createProduct(sku, name, price);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
// getting array of products if exist
export const getAll = async (req: Request, res: Response) => {
  try {
    const products = await productsService.getAllProducts();
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};