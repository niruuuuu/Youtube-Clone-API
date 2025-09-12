import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import mongoose, { mongo } from "mongoose"

const uplaodVideo = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body

    if (title.trim() === "" || description.trim() == "") {
      throw new ApiError(400, "Each field is required")
    }

    let videoFileLocalPath
    if(req.files && Array.isArray(req.files.videoFile)) {
      videoFileLocalPath = req.files.videoFile[0]?.path
    }

    if (!videoFileLocalPath) {
      throw new ApiError(400, "Something went wrong")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    if (!videoFile) {
      throw new ApiError(400, "Something went wrong")
    }

    let thumbnailLocalPath
    if (req.files && Array.isArray(req.files.thumbnail)) {
      thumbnailLocalPath = req.files.thumbnail[0]?.path
    }

    if(!thumbnailLocalPath) {
      throw new ApiError(400, "Something went wrong")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
      throw new ApiError(400, "Something went wrong")
    }

    const video = await Video.create({
      title,
      description,
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      duration: videoFile.duration,
      owner: req.user?._id
    })

    res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"))
  } catch (error) {
    throw new ApiError(400, error.message || "Something went wrong")
  }
})

const updateVideoTitleAndDescription = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body

    if (title.trim() === "" || description.trim() === "") {
      throw new ApiError(400, "All fields are required")
    }

    const video = await Video.findById(req.params?.videoId)

    if (!video) {
      throw new ApiError(400, "Video not found")
    }

    if (!video.owner.equals(req.user?._id)) {
      throw new ApiError(400, "You don't have access to edit this video")
    }

    video.title = title
    video.description = description

    res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"))
    await video.save()
  } catch (error) {
    throw new ApiError(400, error?.message || "Something Went Wrong")
  }
})

const updateVideoThumbnail = asyncHandler(async (req, res) => {
  try {
    const video = await Video.findById(req.params?.videoId)

    if (!video) {
      throw new ApiError(400, "Video not found")
    }

    if (!(video.owner.equals(req.user?._id))) {
      throw new ApiError(400, "You don't have access to edit this video")
    }

    if (!req.file) {
      throw new ApiError(400, "Something went wrong")
    }

    let thumbnailLocalPath = req.file.path

    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Something went wrong")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail) {
      throw new ApiError(400, "Something went wrong")
    }

    video.thumbnail = thumbnail.url
    await video.save()

    res
    .status(200)
    .json(new ApiResponse(200, video, "Thumbnail updated successfully"))
  } catch (error) {
    throw new ApiError(400, error?.message || "Something Went Wrong")
  }
})

const deleteVideo = asyncHandler(async (req, res) => {
  try {
    const video = await Video.findById(req.params?.videoId)

    if (!video) {
      throw new ApiError(400, "Video Not Found")
    }

    if (!(video.owner.equals(req.user?._id))) {
      throw new ApiError(400, "You don't have access to delete this video")
    }

    const deletedVideo = await Video.findByIdAndDelete(video._id)

    if (!deleteVideo) {
      throw new ApiError(400, "Something went wrong")
    }

    res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"))
  } catch (error) {
    throw new ApiError(400, error?.message || "Something Went Wrong")
  }
})

const watchVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Can't find video")
  }

  const video = await Video.findById(videoId)
  video.views = video.views + 1
  await video.save()

  if (!video) {
    throw new ApiError(400, "Video not found")
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user?._id },
    {
      $push: {
        watchHistory: video._id
      }
    },
    {
      returnDocument: "after"
    }
  )

  if (!user) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, video, "Video fetched successfully"))
})

const videoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Video not found")
  }

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(400, "Something went wrong")
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $addFields: {
        isLiked: {
          $cond: {
            if: { $in: [user._id, { $ifNull: ["$likes", []] } ]},
            then: true,
            else: false
          }
        },
        isDisliked: {
          $cond: {
            if: { $in: [user._id, { $ifNull: ["$dislikes", []] }]},
            then: true,
            else: false
          }
        }
      }
    }
  ])

  if (!video) {
    throw new ApiError(400, "Video not found")
  }

  let modifiedVideo
  let modifiedUser
  if (!video[0].isLiked && !video[0].isDisliked) {
    modifiedVideo = await Video.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(video[0]?._id)
      },
      {
        $push: {
          likes: user._id
        }
      },
      {
        returnDocument: "after"
      }
    )

    modifiedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $push: {
          likedVideos: modifiedVideo._id
        }
      }
    )
  } else if (video[0].isLiked && !video[0].isDisliked) {
    modifiedVideo = await Video.findOneAndUpdate(
      {
        _id: video[0]?._id
      },
      {
        $pull: {
          likes: user._id
        }
      },
      {
        returnDocument: "after"
      }
    )

    modifiedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $pull: {
          likedVideos: modifiedVideo._id
        }
      },
      {
        returnDocument: "after"
      }
    )
  } else if (!video[0].isLiked && video[0].isDisliked) {
    modifiedVideo = await Video.findOneAndUpdate(
      {
        _id: video[0]._id
      },
      {
        $pull: {
          dislikes: user._id
        },
        $push: {
          likes: user._id
        }
      },
      {
        returnDocument: "after"
      }
    )

    modifiedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $push: {
          likedVideos: modifiedVideo._id
        }
      }
    )
  }

  if (!modifiedVideo) {
    throw new ApiError(400, "Something went wrong")
  }


  res
  .status(200)
  .json(new ApiResponse(200, modifiedVideo, "Liked status updated"))
})

const videoDislike = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Video not found")
  }

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(400, "User not found")
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $addFields: {
        isLiked: {
          $cond: {
            if: { $in: [user._id, { $ifNull: ["$likes", []] }] },
            then: true,
            else: false
          }
        },
        isDisiked: {
          $cond: {
            if: { $in: [user._id, { $ifNull: ["$dislikes", []] }] },
            then: true,
            else: false
          }
        }
      }
    }
  ])

  if (!video) {
    throw new ApiError(400, "Video not found")
  }

  let modifiedUser
  let modifiedVideo

  if (!video[0].isLiked && !video[0].isDisiked) {
    modifiedUser = await Video.findOneAndUpdate(
      {
        _id: video[0]._id
      },
      {
        $push: {
          dislikes: user._id
        }
      },
      {
        returnDocument: "after"
      }
    )
  } else if (video[0].isLiked && !video[0].isDisiked) {
    modifiedVideo = await Video.findOneAndUpdate(
      {
        _id: video[0]._id
      },
      {
        $push: {
          dislikes: user._id
        },
        $pull: {
          likes: user._id
        }
      },
      {
        returnDocument: "after"
      }
    )

    modifiedUser = await User.findOneAndUpdate(
      {
        _id: user._id
      },
      {
        $pull: { likedVideos: modifiedVideo._id }
      },
      {
        returnDocument: "after"
      }
    )
  } else if (!video[0].isLiked && video[0].isDisiked) {
    modifiedVideo = await Video.findOneAndUpdate(
      {
        _id: video[0]._id
      },
      {
        $pull: { dislikes: user._id }
      },
      {
        returnDocument: "after"
      }
    )
  }

  console.log(modifiedVideo)

  res
  .status(200)
  .json(new ApiResponse(200, modifiedVideo, "Dislike status updated"))
})

export {
  uplaodVideo,
  updateVideoTitleAndDescription,
  updateVideoThumbnail,
  deleteVideo,
  watchVideo,
  videoLike,
  videoDislike
}