import { Comment } from "../models/comments.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const uploadComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Something went wrong");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  const { comment } = req.body;

  if (!comment) {
    throw new ApiError(400, "Comment is required");
  }

  const newComment = await Comment.create({
    comment: comment,
    author: req.user?._id,
    video: video._id,
  });

  if (!newComment) {
    throw new ApiError(400, "Something went wrong");
  }

  res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment uploaded Successfully"));
});

const editComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  if (!comment) {
    throw new ApiError(400, "Comment is required");
  }

  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Something went wrong");
  }

  const findComment = await Comment.findById(commentId);

  if (!findComment) {
    throw new ApiError(400, "Comment not found");
  }

  if (!req.user?._id.equals(findComment.author)) {
    throw new ApiError(400, "You don't have authorize to edit this comment");
  }

  const updateComment = await Comment.findOneAndUpdate(
    { _id: commentId },
    {
      $set: {
        comment: comment,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updateComment) {
    throw new ApiError(400, "Comment not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updateComment, "Comment Updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { videoId, commentId } = req.params;

  if (!commentId || !videoId) {
    throw new ApiError(400, "Something went wrong");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(400, "Comment not found");
  }

  const commentedVideo = await Video.findById(videoId);

  if (!commentedVideo) {
    throw new ApiError(400, "Something went wrong");
  }

  console.log(commentedVideo);

  if (
    req.user?._id.equals(commentedVideo.owner) ||
    req.user?._id.equals(comment.author)
  ) {
    const deleteComment = await Comment.findOneAndDelete({ _id: comment._id });

    if (!deleteComment) {
      throw new ApiError(400, "Something went wrong");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, deleteComment, "Comment deleted successfully")
      );
  } else {
    throw new ApiError(400, "You are not authorized to delete this comment")
  }
});

const likeComment = asyncHandler(async (req, res) => {
  const { videoId, commentId } = req.params

  if (!videoId || !commentId) {
    throw new ApiError(400, "Something went wrong")
  }

  const comment = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(commentId)
      }
    },
    {
      $addFields: {
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, { $ifNull: ["$likes", []] }] },
            then: true,
            else: false
          }
        },
        isDisliked: {
          $cond: {
            if: { $in: [req.user?._id, { $ifNull: ["$dislikes", []] }] },
            then: true,
            else: false
          }
        }
      }
    }
  ])

  if (!comment) {
    throw new ApiError(400, "Comment not available")
  }

  let likedComment

  if (comment[0].isLiked && comment[0].isDisliked) {
    throw new ApiError(400, "Something went wrong")
  } else if (!comment[0].isLiked && !comment[0].isDisliked) {
    likedComment = await Comment.findOneAndUpdate(
      {
        _id: comment[0]._id
      },
      {
        $push: {
          likes: req.user?._id
        }
      }, { returnDocument: "after" }
    )
  } else if (comment[0].isLiked && !comment[0].isDisliked) {
    likedComment = await Comment.findOneAndUpdate(
      {
        _id: comment[0]._id
      },
      {
        $pull: {
          likes: req.user?._id
        }
      }, { returnDocument: "after" }
    )
  } else if (!comment[0].isLiked && comment[0].isDisliked) {
    likedComment = await Comment.findOneAndUpdate(
      {
        _id: comment[0]._id
      },
      {
        $pull: {
          dislikes: req.user?._id
        },
        $push: {
          likes: req.user?._id
        }
      }, { returnDocument: "after" }
    )
  }

  res
  .status(200)
  .json(new ApiResponse(200, likedComment, "Like status updated successfully"))
})

const dislikeComment = asyncHandler(async (req, res) => {
  const { videoId, commentId } = req.params

  if (!videoId || !commentId) {
    throw new ApiError(400, "Something went wrong")
  }

  const comment = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(commentId)
      }
    },
    {
      $addFields: {
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, { $ifNull: ["$likes", []] }] },
            then: true,
            else: false
          }
        },
        isDisliked: {
          $cond: {
            if: { $in: [req.user?._id, { $ifNull: ["$dislikes", []] }] },
            then: true,
            else: false
          }
        }
      }
    }
  ])

  if (!comment) {
    throw new ApiError(400, "Comment not found")
  }

  let dislikedComment

  if (comment[0].isLiked && comment[0].isDisliked) {
    throw new ApiError(400, "Something went wrong")
  } else if (comment[0].isLiked && !comment[0].isDisliked) {
    dislikedComment = await Comment.findOneAndUpdate(
      {
        _id: comment[0]._id
      },
      {
        $pull: {
          likes: req.user?._id
        },
        $push: {
          dislikes: req.user?._id
        }
      },
      { returnDocument: "after" }
    )
  } else if (!comment[0].isLiked && comment[0].isDisliked) {
    dislikedComment = await Comment.findOneAndUpdate(
      {
      _id: comment[0]._id
      },
      {
        $pull: {
          dislikes: req.user?._id
        }
      },
      { returnDocument: "after" }
    )
  } else if (!comment[0].isLiked && !comment[0].isDisliked) {
    dislikedComment = await Comment.findOneAndUpdate(
      {
        _id: comment[0]._id
      },
      {
        $push: {
          dislikes: req.user?._id
        }
      },
      { returnDocument: "after" }
    )
  }

  res
  .status(200)
  .json(new ApiResponse(200, dislikedComment, "Dislike status updated"))
})

export { uploadComment, editComment, deleteComment, likeComment, dislikeComment }