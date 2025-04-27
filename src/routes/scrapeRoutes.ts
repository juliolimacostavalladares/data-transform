import { Router, Request, Response, NextFunction } from "express";
import { scrapeController } from "../controllers/scrapeController";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await scrapeController.scrapeUrls(req, res);
  } catch (error) {
    next(error);
  }
});

export { router as scrapeRouter };
