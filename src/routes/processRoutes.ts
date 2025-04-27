import { Router } from "express";
import {
  processData,
  exportData,
  collections,
} from "../controllers/processController";

const router = Router();

router.post("/", processData);
router.post("/start-extraction/export-data", exportData);
router.get("/list/collections/:userId", collections);
export { router as processRoutes };
