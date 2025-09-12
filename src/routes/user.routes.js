import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
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
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser
);

router.route("/login").post(loginUser)
router.route("/logout").get(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/update-user-info").post(verifyJWT, updateUserInfo)

router.route("/update-user-avatar").post(
  verifyJWT,
  upload.single("avatar"),
  updateUserAvatar
)

router.route("/update-user-coverimage").post(
  verifyJWT,
  upload.single("coverImage"),
  updateUserCoverImage
)

router.route("/update-user-password").post(verifyJWT, updateUserPassword)
router.route("/subscribe-channel/:channelId").get(verifyJWT, subscribeChannel)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)


export default router;
