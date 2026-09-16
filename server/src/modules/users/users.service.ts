import { prisma } from '../../config/prisma';

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