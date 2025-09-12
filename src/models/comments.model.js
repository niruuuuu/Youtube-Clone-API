import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
  comment: {
    type: Schema.Types.String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  video: {
    type: Schema.Types.ObjectId,
    ref: "Video"
  },
  likes: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: []
    }
  ],
  dislikes: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: []
    }
  ]
},
{
  timestamps: true
})

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)