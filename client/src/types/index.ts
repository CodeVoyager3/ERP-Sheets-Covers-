// Shared TypeScript types mirroring the backend DTOs.
// Prisma Decimal fields arrive as strings over JSON — keep them as string and format at display time.

export type Role = "OWNER" | "STAFF";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PRODUCTION"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type StockMovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT"
  | "PRODUCTION_YIELD";

export type LedgerAccount =
  | "REVENUE"
  | "ACCOUNTS_RECEIVABLE"
  | "CASH"
  | "COGS"
  | "INVENTORY_VALUE";

export type WorkOrderStatus = "PLANNED" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  email?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: string;
}

export interface Order {
  id: string;
  customerName: string;
  status: OrderStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  createdBy: {
    name: string;
    email: string;
  };
}

export interface StockLevel {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  orderId: string | null;
  userId: string;
  note: string | null;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  productId: string;
  quantity: number;
  status: WorkOrderStatus;
  createdAt: string;
  updatedAt: string;
  product: Product;
}

export interface LedgerEntry {
  id: string;
  orderId: string | null;
  account: LedgerAccount;
  debit: string;
  credit: string;
  userId: string;
  createdAt: string;
  order: {
    customerName: string;
    status: OrderStatus;
  } | null;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: Role;
  };
}
