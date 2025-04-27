import { Router } from "express";
import { createUserWebHook, findUser } from "../controllers/userController";

const router = Router();

router.post("/webhook/user", createUserWebHook);
router.post("/find/user/:id", findUser);

export { router as userRouter };
