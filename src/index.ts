import express, {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import { scrapeRouter } from "./routes/scrapeRoutes";
import { processRoutes } from "./routes/processRoutes";
import { tablesRouter } from "./routes/tablesRouter";
import { userRouter } from "./routes/userRoute";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import cors from "cors";
import { scrapeQueue, dlq, saveQueue, aiQueue } from "./queues/scrapeQueue";
import "./queues/scrapeWorker";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullAdapter(scrapeQueue),
    new BullAdapter(dlq),
    new BullAdapter(saveQueue),
    new BullAdapter(aiQueue),
  ],
  serverAdapter,
});

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"], // Permite os métodos GET e POST e DELETE
    allowedHeaders: ["Content-Type", "Authorization"], // Permite cabeçalhos específicos
  })
);

app.use(((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Erro:", error);
  res
    .status(error?.status || 500)
    .json({ error: error.message || "Erro interno do servidor" });
}) as ErrorRequestHandler);

app.use("/admin/queues", serverAdapter.getRouter());
app.use("/api/extract-data", scrapeRouter);
app.use("/api/", processRoutes);
app.use("/api", tablesRouter);
app.use("/api", userRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Bull Board: http://localhost:${PORT}/admin/queues`);
});
