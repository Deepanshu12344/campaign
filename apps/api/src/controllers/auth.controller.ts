import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import {
  SignUpInput,
  SignInInput,
  RefreshTokenInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '@campaigns/shared';

export class AuthController {
  async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signUp(req.body as SignUpInput);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signIn(req.body as SignInInput);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refreshToken(req.body as RefreshTokenInput);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.updateMe(req.user!.id, req.body as UpdateProfileInput);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.changePassword(req.user!.id, req.body as ChangePasswordInput);
      res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
