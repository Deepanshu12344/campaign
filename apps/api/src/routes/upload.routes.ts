import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware';
import { BadRequestError } from '../utils/errors';
import { storageService } from '../services/storage.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

router.post(
  '/uploads',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('File size exceeds the 5MB limit.'));
        }
        return next(new BadRequestError(`Upload error: ${err.message}`));
      }
      if (err) {
        return next(err);
      }
      if (!req.file) {
        return next(new BadRequestError('No file provided for upload.'));
      }

      try {
        const result = await storageService.uploadFile(req.file);
        res.status(201).json(result);
      } catch (uploadError) {
        next(uploadError);
      }
    });
  }
);

export const uploadRoutes = router;
