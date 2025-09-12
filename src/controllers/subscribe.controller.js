import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

const subscribe = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Something went wrong");
  }

  if (req.user?._id.equals(channelId)) {
    throw new ApiError(400, "You can't subscribe your own channel");
  }

  const channel = await User.findById(channelId).select(
    "-password -watchHistory -likedVideos -refreshToken"
  );

  if (!channel) {
    throw new ApiError(400, "Channel not found");
  }

  let subscribe = await Subscription.findOne({
    $and: [
      {
        subscriber: req.user?._id,
      },
      {
        channel: channel._id,
      },
    ],
  });

  if (subscribe) {
    subscribe = await Subscription.findOneAndDelete({
      subscriber: req.user?._id,
      channel: channel._id,
    });
  } else {
    subscribe = await Subscription.create({
      subscriber: req.user?._id,
      channel: channel._id,
    });
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribe,
        "Subscription status updated successfully"
      )
    );
});

const getAllSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "channel",
        localField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "subscriber",
              as: "subscriber",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    firstname: 1,
                    lastname: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  if (!subscribers) {
    throw new ApiError(400, "Something went wrong");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "All Subscribers fetched successfully")
    );
});

const getAllSubscribedChannels = asyncHandler(async (req, res) => {
  const channels = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "subscriber",
        localField: "_id",
        as: "channels",
        pipeline: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "channel",
              as: "channel",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    firstname: 1,
                    lastname: 1,
                    avatar: 1
                  }
                }
              ]
            },
          },
        ],
      },
    },
  ]);

  if (!channels) {
    throw new ApiError(400, "Something went wrong")
  }

  res
  .status(200)
  .json(new ApiResponse(200, channels, "All Channels fetched successfully"))
});

export { subscribe, getAllSubscribers, getAllSubscribedChannels };
