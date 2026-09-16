import { prisma } from '../../config/prisma';

export const createProduct = async (sku: string, name: string, price: number) => {
  const existingProduct = await prisma.product.findUnique({ where: { sku } });
  if (existingProduct) {
    throw new Error('A product with this SKU already exists');
  }

  return await prisma.product.create({
    data: { sku, name, price }
  });
};

export const getAllProducts = async () => {
  return await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
};