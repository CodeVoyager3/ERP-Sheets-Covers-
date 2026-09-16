import { Router } from 'express';
import { signup, login, getMe} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

// protected route
router.get('/me', authenticate, getMe)

export default router;