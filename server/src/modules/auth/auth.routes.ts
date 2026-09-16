import { Router } from 'express';
import { signup, login, getMe} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../lib/validate'; 
import { signupSchema, loginSchema } from './auth.schema'; 

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);

// protected route
router.get('/me', authenticate, getMe)

export default router;