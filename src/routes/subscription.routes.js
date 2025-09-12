import { Router } from "express";
import { subscribe, getAllSubscribers, getAllSubscribedChannels } from "../controllers/subscribe.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/subscribe/:channelId").get(verifyJWT, subscribe);
router.route("/all-subscribers").get(verifyJWT, getAllSubscribers);
router.route("/all-subscribed-channels").get(verifyJWT, getAllSubscribedChannels);

export default router;