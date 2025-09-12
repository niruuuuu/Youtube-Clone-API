import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
  },
  videoFile: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: []
  },
  dislikes: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: []
    }
  ],
  isPublished: {
    type: Boolean,
    default: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true })

videoSchema.plugin(mongooseAggregatePaginate) // test it while writing aggreation queries

export const Video = mongoose.model("Video", videoSchema)
