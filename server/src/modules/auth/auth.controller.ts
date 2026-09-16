import { Request, Response} from 'express';
import * as authService from './auth.service'

export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password} = req.body;
        const user = await authService.registerOwner(name,email, password);
        res.status(201).json({ message: 'Owner created Succesfully', user});
    } catch (error: any){
        res.status(400).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response)=> {
    try {
        const { email, password } = req.body;
        const data = await authService.loginUser(email, password);
        res.status(200).json(data);
    } catch (error: any){
        res.status(401).json({ error: error.message});
    }
};
