import multer from 'multer';
import config from '../config/index.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (!file || !file.originalname) {
      cb(new Error('Tệp đính kèm không hợp lệ'));
      return;
    }
    cb(null, true);
  }
});

export const uploadMessageAttachment = upload.single('attachment');
