import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateUserRoleAndStatus = async (
  userId: string,
  role?: 'OWNER' | 'STAFF', 
  isActive?: boolean
) => {
  // Use Record<string, any> to bypass strict optional property checks on the intermediate object
  const data: Record<string, any> = {};
  
  if (role) {
    data.role = role;
  }
  if (typeof isActive === 'boolean') {
    data.isActive = isActive;
  }

  return await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
};

export const getUserActivityLog = async (userId: string) => {
  return await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const createUser = async (
  creatorId: string,
  data: { name: string; email: string; password: string; role: 'OWNER' | 'STAFF' }
) => {
  const email = data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('A user with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 10);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name.trim(), email, passwordHash, role: data.role, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await tx.activityLog.create({
      data: {
        userId: creatorId,
        action: 'user_created',
        entityType: 'User',
        entityId: user.id,
        details: { email: user.email, role: user.role },
      },
    });

    return user;
  });
};
