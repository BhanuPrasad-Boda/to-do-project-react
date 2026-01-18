const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: "uploads/avatars",
  filename: (req, file, cb) => {
     const ext = path.extname(file.originalname); // .jpg .png
  cb(null, Date.now() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

module.exports = uploadAvatar;
