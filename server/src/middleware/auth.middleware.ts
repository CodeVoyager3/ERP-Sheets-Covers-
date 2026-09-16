import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction)=>{
    // extraction of token from "Authorization: Bearer " header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided'});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        // attaching the userId and role extracted from the payload to the req object
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token'});
    }
};
