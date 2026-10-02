const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dossier = path.join(__dirname, "../../uploads");

if (!fs.existsSync(dossier)) {
  fs.mkdirSync(dossier, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossier),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const typesAutorises = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (typesAutorises.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorisé"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadFichier = (champ) => (req, res, next) => {
  upload.single(champ)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (req.file) {
      req.body[champ] = `/uploads/${req.file.filename}`;
    }
    next();
  });
};

module.exports = { uploadFichier };
