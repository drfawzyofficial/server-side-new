const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage to process images with Sharp before saving
const storage = multer.memoryStorage();

// File filter for image files only
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit for images
		files: 1 // Only one file at a time
	}
});

// Post-upload processor: compress and write to disk as WebP
const processAvatar = async (req, res, next) => {
	try {
		if (!req.file) return next();

		const userId = req.userId || 'unknown';
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const outExt = '.webp';
		const filename = `avatar-${userId}-${uniqueSuffix}${outExt}`;
		const outPath = path.join(uploadsDir, filename);

		// Compress: rotate by EXIF, resize to max 512px, webp quality 80
		await sharp(req.file.buffer)
			.rotate()
			.resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 80 })
			.toFile(outPath);

		// Keep compatibility with existing controller usage
		req.file.filename = filename;
		req.file.path = outPath;

		next();
	} catch (error) {
		next(error);
	}
};

// Middleware for single avatar file upload (upload + compression step)
const uploadAvatar = [upload.single('avatar'), processAvatar];

// Helper function to get avatar file URL
const getAvatarUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/avatars/${filename}`;
};

// Helper function to delete avatar file
const deleteAvatarFile = (filename) => {
  if (!filename) return false;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting avatar file:', error);
      return false;
    }
  }
  return false;
};

module.exports = {
  uploadAvatar,
  getAvatarUrl,
  deleteAvatarFile,
  uploadsDir
};

