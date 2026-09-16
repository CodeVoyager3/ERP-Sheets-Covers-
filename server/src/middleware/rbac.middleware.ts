import { Request, Response, NextFunction } from 'express';

export const requireRole = (...roles: string[]) => {
    return (req: Request, res:Response, next: NextFunction)=>{
        const user = (req as any).user;
        // checking if the user's role exists in the allowed roles array or not
        if(!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions'});
        }
        next();
    }
    
}