import multer from 'multer';
import path from 'path';
import config from '../config/index.js';

const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép ảnh: JPG, PNG, GIF, WEBP'));
    }
  }
});

export const uploadPostImage = upload.single('file');
