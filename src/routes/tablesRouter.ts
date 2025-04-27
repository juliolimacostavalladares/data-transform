import { Router } from "express";
import {
  createDatabase,
  listUserDatabases,
  deleteDatabase,
  getDatabase,
  updateDatabase,
  getUserExtractionsAndDatabases,
} from "../controllers/tablesController";

const router = Router();

router.post("/create-database", createDatabase);
router.get("/list/databases/:id", listUserDatabases);
router.get("/find/databases/:id", getDatabase);
router.put("/update/databases/:id", updateDatabase);
router.delete("/delete/databases/:databaseId/:externalId", deleteDatabase);
router.get("/extractions-and-databases/:id", getUserExtractionsAndDatabases);

export { router as tablesRouter };
