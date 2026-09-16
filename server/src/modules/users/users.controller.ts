import { Request, Response } from 'express';
import * as usersService from './users.service';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const updatedUser = await usersService.updateUserRoleAndStatus(id as string, role, isActive);
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};