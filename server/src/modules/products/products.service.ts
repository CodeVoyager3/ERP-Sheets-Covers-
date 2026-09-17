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

export const getProductById = async (id: string) => {
  return await prisma.product.findUnique({
    where: { id },
    include: { bomLines: { include: { componentProduct: true } } }
  });
};

export const updateProduct = async (id: string, data: { name?: string; price?: number }) => {
  return await prisma.product.update({ where: { id }, data });
};

export const addBomLine = async (parentProductId: string, componentProductId: string, quantityRequired: number) => {
  return await prisma.bomLine.create({
    data: { parentProductId, componentProductId, quantityRequired }
  });
};