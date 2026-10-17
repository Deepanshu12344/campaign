import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  SignUpInputSchema,
  SignInInputSchema,
  RefreshTokenInputSchema,
  UpdateProfileInputSchema,
  ChangePasswordInputSchema,
} from '@campaigns/shared';

const router = Router();

router.post('/sign-up', validate({ body: SignUpInputSchema }), authController.signUp);
router.post('/sign-in', validate({ body: SignInInputSchema }), authController.signIn);
router.post('/refresh', validate({ body: RefreshTokenInputSchema }), authController.refresh);
router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate({ body: UpdateProfileInputSchema }), authController.updateMe);
router.post(
  '/change-password',
  requireAuth,
  validate({ body: ChangePasswordInputSchema }),
  authController.changePassword
);

export default router;
