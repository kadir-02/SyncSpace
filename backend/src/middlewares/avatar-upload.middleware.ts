import multer from "multer";
import { AppError } from "../utils/app-error.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Profile pictures: images only, small, one file in the "avatar" field.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError("Avatar must be a JPG, PNG, WebP or GIF image", 400));
    }

    callback(null, true);
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },
});
