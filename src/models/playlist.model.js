import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema({
  name: {
    type: Schema.Types.String,
    required: true,
  },
  description: {
    type: Schema.Types.String,
    required: true,
  },
  videos: [
    {
      type: Schema.Types.ObjectId,
      ref: "Video"
    }
  ],
  owner: {
    this: Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true })

export const Playlist = mongoose.model("Playlist", playlistSchema)