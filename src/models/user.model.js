import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";

const userSchema = new Schema(
  {
    firstname: {
      type: Schema.Types.String,
      required: true,
      trim: true,
    },
    lastname: {
      type: Schema.Types.String,
      required: true,
      trim: true,
    },
    username: {
      type: Schema.Types.String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // optimize searching
    },
    email: {
      type: Schema.Types.String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // optimize searching
    },
    password: {
      type: Schema.Types.String,
      required: [true, "Password is required"],
    },
    avatar: {
      type: Schema.Types.String,
      required: true,
    },
    coverImage: {
      type: Schema.Types.String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    likedVideos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
        default: []
      },
    ],
    refreshToken: {
      type: Schema.Types.String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  return next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
};

userSchema.methods.generateAccessToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      firstname: this.firstname,
      lastname: this.lastname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  );

  return token;
};

userSchema.methods.generateRefreshToken = function () {
  const token = jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRSH_TOKEN_EXPIRY
    }
  );

  return token;
};

export const User = mongoose.model("User", userSchema);
