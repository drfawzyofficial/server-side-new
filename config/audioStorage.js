const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'audio');
const tmpDir = path.join(__dirname, '..', 'uploads', 'tmp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Configure multer to write raw upload to temp directory first
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    // Generate temp filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.bin';
    cb(null, `upload-${uniqueSuffix}${extension}`);
  }
});

// File filter for audio files only
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
    'audio/aac'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Transcode/compress to WebM (Opus), 64 kbps, mono, 48 kHz
const processAudio = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const inPath = req.file.path;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const outName = `audio-${uniqueSuffix}.webm`;
    const outPath = path.join(uploadsDir, outName);

    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .audioCodec('libopus')
        .audioBitrate('64k')
        .audioChannels(1)
        .audioFrequency(48000)
        .format('webm')
        .on('error', reject)
        .on('end', resolve)
        .save(outPath);
    });

    // Replace multer file metadata to point to compressed output
    try { fs.unlinkSync(inPath); } catch {}
    req.file.mimetype = 'audio/webm';
    req.file.size = fs.statSync(outPath).size;
    req.file.filename = outName;
    req.file.path = outPath;

    next();
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(err);
  }
};

// Middleware for single audio file upload (temp save + compression)
const uploadAudio = [upload.single('audio'), processAudio];

// Helper function to get audio file URL
const getAudioUrl = (filename) => {
  return `/uploads/audio/${filename}`;
};

// Helper function to delete audio file
const deleteAudioFile = (filename) => {
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

module.exports = {
  uploadAudio,
  getAudioUrl,
  deleteAudioFile,
  uploadsDir
};
