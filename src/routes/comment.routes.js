import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  uploadComment,
  editComment,
  deleteComment,
  likeComment,
  dislikeComment
} from "../controllers/comment.controller.js";

const router = Router()

router.route("/upload-comment/:videoId").post(verifyJWT, uploadComment)
router.route("/edit-comment/:commentId").post(verifyJWT, editComment)
router.route("/delete-comment/:videoId/:commentId").delete(verifyJWT, deleteComment)
router.route("/like-comment/:videoId/:commentId").get(verifyJWT, likeComment)
router.route("/dislike-comment/:videoId/:commentId").get(verifyJWT, dislikeComment)

export default router