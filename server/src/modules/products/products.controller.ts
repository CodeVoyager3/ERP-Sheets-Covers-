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

export const getOne = async (req: Request, res: Response) => {
  try {
    const product = await productsService.getProductById(req.params.id as string);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addBom = async (req: Request, res: Response) => {
  try {
    const { componentId, quantity } = req.body;
    const bomLine = await productsService.addBomLine(req.params.id as string, componentId, Number(quantity));
    res.status(201).json({ message: 'BOM line added', bomLine });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, price } = req.body;
    const updated = await productsService.updateProduct(id, { name, price });
    res.status(200).json({ message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};