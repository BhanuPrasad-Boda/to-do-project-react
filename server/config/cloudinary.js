

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "todo-app-avatars", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 300, height: 300, crop: "fill" }, // resize = faster load
      { quality: "auto" } // optimize size
    ],
  },
});

const upload = require("multer")({ storage });

module.exports = upload;
