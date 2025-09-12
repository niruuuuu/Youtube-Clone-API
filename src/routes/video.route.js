import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  uplaodVideo,
  updateVideoTitleAndDescription,
  updateVideoThumbnail,
  deleteVideo,
  watchVideo,
  videoLike,
  videoDislike
} from "../controllers/video.controller.js";

const router = Router();

router.route("/upload-video").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1
    }
  ]),
  uplaodVideo
);

router.route("/update-title-description/:videoId").post(verifyJWT, updateVideoTitleAndDescription)

router.route("/update-thumbnail/:videoId").post(
  upload.single("thumbnail"),
  verifyJWT,
  updateVideoThumbnail
)

router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo)
router.route("/watch/:videoId").get(verifyJWT, watchVideo)
router.route("/like-video/:videoId").get(verifyJWT, videoLike)
router.route("/dislike-video/:videoId").get(verifyJWT, videoDislike)

export default router;
