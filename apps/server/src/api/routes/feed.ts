import { Router } from "express";
import { getPosts, createPost, stakeOnPost, getCurrentEpoch } from "../../epoch/EpochManager.js";

const router = Router();

router.get("/", (_req, res) => {
  const posts = getPosts();
  const epoch = getCurrentEpoch();
  res.json({ posts, epoch });
});

router.post("/post", (req, res) => {
  const { content, author } = req.body;
  if (!content || !author) {
    res.status(400).json({ error: "content and author required" });
    return;
  }
  const post = createPost(author, "human", content);
  res.json(post);
});

router.post("/stake", (req, res) => {
  const { postId, staker } = req.body;
  if (!postId || !staker) {
    res.status(400).json({ error: "postId and staker required" });
    return;
  }
  const result = stakeOnPost(postId, staker, false);
  res.json(result);
});

router.get("/epoch", (_req, res) => {
  res.json(getCurrentEpoch());
});

export default router;
