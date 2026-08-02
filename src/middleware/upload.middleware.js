const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadFolder = process.env.UPLOAD_DIR || 'image';
const imageDir = path.isAbsolute(uploadFolder)
  ? uploadFolder
  : path.join(__dirname, '../../', uploadFolder);

if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder + '/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
