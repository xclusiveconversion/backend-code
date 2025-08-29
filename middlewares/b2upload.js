import multer from 'multer';

const storage = multer.memoryStorage();

export const b2upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max
});
