const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  UserId: { type: String, required: [true, "UserId is required"], unique: true },
  UserName: { type: String, required: [true, "UserName is required"] },
  Password: { type: String, required: [true, "Password is required"] },

    resetToken: String,
  resetTokenExpiry: Date,
  
  Email: { type: String, required: [true, "Email is required"], unique: true },
  Mobile: { 
    type: String, 
    required: [true, "Mobile is required"], 
    unique: true,
    trim: true,
    validate: {
      validator: v => v.trim() !== "",
      message: "Mobile cannot be empty"
    }
  },
  Avatar: {
  type: String,
  default: function () {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${this.UserId}`;
  }
}

});


userSchema.index({ UserId: 1 }, { unique: true });
userSchema.index({ Email: 1 }, { unique: true });
userSchema.index({ Mobile: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
