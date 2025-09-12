import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const refreshToken = user.generateRefreshToken()
    const accessToken = user.generateAccessToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh & access tokens")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // take all user data
  // validation
  // check if the username or email already has been registered or not
  // check for images, check for avatar
  // upload them to cloudinary
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { firstname, lastname, username, email, password } = req.body

  if (
    [firstname, lastname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Enter valid email")
  }

  const userExist = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (userExist) throw new ApiError(409, "User already exists")

  if (!req.files) {
    throw new ApiError(400, "Something went wrong while receiving files from request")
  }

  const avatarLocalPath = req.files.avatar[0]?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Something went wrong")
  }

  let coverImageLocalPath
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    console.log("OOO")
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  let coverImage
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath)
  }

  if (!avatar) {
    throw new ApiError(400, "Something went wrong while uploading avatar on cloudinary")
  }

  const user = await User.create({
    firstname,
    lastname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong")
  }

  return res
  .status(201)
  .json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  // get all data from frontend
  // validate those data
  // check if user exist or not
  // password check
  // generate access & refresh token
  // send cookies

  const { email, username, password } = req.body

  if (!email && !username) {
    throw new ApiError(400, "Username or Email is required")
  }

  if (!password) {
    throw new ApiError(400, "Password field is required")
  }

  const user = await User.findOne({
    $or: [{email}, {username}]
  })

  if (!user) {
    throw new ApiError(400, "User doesn't exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Wrong password")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(200, {
      user: loggedInUser, accessToken, refreshToken
    }, "User logged in successfully")
  )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorize request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(400, "Invalid Refresh Token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(400, "Refresh Token is expired or invalid")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const token = await generateAccessAndRefreshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken", token.accessToken, options)
    .cookie("refreshToken", token.refreshToken, options)
    .json(new ApiResponse(200, token, "Tokens generated successfully"))
  } catch (error) {
    throw new ApiError(400, "Something went wrong")
  }
})

const updateUserInfo = asyncHandler(async (req, res) => {
  const { firstname, lastname, username, email } = req.body

  if ([firstname, lastname, username, email].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Each fiels is required")
  }

  const user = await User.findOneAndUpdate(
    {_id: req.user._id},
    {
      $set: {
        firstname, lastname, username, email
      }
    },
    {
      projection: {
        password: 0,
        refreshToken: 0
      },
      returnDocument: "after",
    }
  )

  if (!user) {
    throw new ApiError(400, "Unauthorize request")
  }

  res
  .status(200)
  .json(new ApiResponse(200, user, "User updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFilePath = req.file?.path

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Something went wrong")
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath)

  if (!avatar) {
    throw new ApiError(400, "Something went wrong")
  }

  const user = await User.findOneAndUpdate(
    {_id: req.user?._id},
    { $set: { avatar: avatar.url } },
    {
      returnDocument: "after",
      projection: {
        password: 0,
        refreshToken: 0
      }
    }
  )

  if (!user) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Something went wrong")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage) {
    throw new ApiError(400, "Something went wrong")
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user?._id },
    { $set: { coverImage: coverImage.url } },
    {
      projection: { password: 0, refreshToken: 0 },
      returnDocument: "after"
    }
  )

  if (!user) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, user, "Cover Image uploaded successfully"))
})

const updateUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body

  if ([currentPassword, newPassword, confirmNewPassword].some((field) => field.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(400, "Unauthorized Request")
  }

  const isPasswordValid = await user.isPasswordCorrect(currentPassword)

  if (!isPasswordValid) {
    throw new ApiError(400, "Wrong Credentials")
  }

  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "New Password & Confirm New Password must be the same")
  }

  user.password = newPassword
  await user.save()

  res
  .status(200)
  .json(200, user, "Password changed successfully")
})

const subscribeChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params

  if (!channelId) {
    throw new ApiError(400, "Channel not found")
  }

  if (req.user?._id.equals(channelId)) {
    throw new ApiError(400, "You can't subscirbe your own channel")
  }

  const isSubscribed = await Subscription.find({
    $and: [
      {
        channel: new mongoose.Types.ObjectId(channelId)
      },
      {
        subscriber: req.user?._id
      }
    ]
  })

  if (!isSubscribed) {
    throw new ApiError(400, "Something went wrong")
  }
  console.log(isSubscribed.length)

  let subscribe
  if (isSubscribed.length === 0) {
    console.log("subscribe")
    subscribe = await Subscription.create({
      subscriber: req.user?._id,
      channel: new mongoose.Types.ObjectId(channelId)
    })
  } else {
    console.log("unsubscribe")
    subscribe = await Subscription.findOneAndDelete({
      $and: [
        {
          channel: new mongoose.Types.ObjectId(channelId)
        },
        {
          subscriber: req.user?._id
        }
      ]
    })
  }

  if (!subscribe) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, subscribe, "Subscription status updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new ApiError(400, "Something went wrong")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        subscribeToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        username: 1,
        firstname: 1,
        lastname: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribeToCount: 1,
        isSubscribed: 1
      }
    }
  ])

  if (!channel?.length) {
    throw new ApiError(400, "Channel doesn't exist")
  }

  res
  .status(200)
  .json(new ApiResponse(200, channel, "Channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    firstname: 1,
                    lastname: 1
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      $project: {
        username: 1,
        firstname: 1,
        lastname: 1,
        avatar: 1,
        coverImage: 1,
        _id: 1,
        watchHistory: 1,
        watchedVideos: 1
      }
    }
  ])

  if (!user) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, user, "History fetched successfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateUserInfo,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserPassword,
  getUserChannelProfile,
  subscribeChannel,
  getWatchHistory
}