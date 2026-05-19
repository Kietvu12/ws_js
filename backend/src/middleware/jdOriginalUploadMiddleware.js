import multer from 'multer';

/** Upload tùy chọn file JD gốc (field `jdOriginalFile`), dùng kèm `data` JSON trong multipart. */
const storage = multer.memoryStorage();
export const uploadJdOriginalOptional = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
}).single('jdOriginalFile');
