import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body, query, and params against the provided schema
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next(); 
    } catch (error: any) { 
      if (error instanceof ZodError) {
        // Use .issues instead of .errors for better type compatibility
        const formattedErrors = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: formattedErrors 
        });
      }
      next(error);
    }
  };
};