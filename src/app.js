import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "20kb", // setting limit
  })
) // accepting json

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.route.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import commentRouter from "./routes/comment.routes.js"

// route declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/comments", commentRouter)

export { app };
