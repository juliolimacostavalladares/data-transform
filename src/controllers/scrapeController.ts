import { Request, Response } from "express";
import { scrapeQueue } from "../queues/scrapeQueue";

const scrapeController = {
  async scrapeUrls(req: Request, res: Response): Promise<void> {
    const { extractionName, sources, userId } = req.body;

    console.log("Extraction data:", { extractionName, sources, userId });

    if (!sources || !Array.isArray(sources)) {
      throw new Error("Sources must be an array.");
    }

    if (!userId) {
      throw new Error("UserId is required.");
    }

    try {
      const promises = [];
      for (const source of sources) {
        const { url, type, name } = source;
        console.log("Processing source:", { url, type, name });
        console.log("Extraction name:", extractionName);
        if (url) {
          promises.push(
            scrapeQueue.add({
              url,
              extractionName,
              userId,
              sourceType: type,
              sourceName: name,
            })
          );
        }
      }
      await Promise.all(promises);
      res.json({ message: "Fontes adicionadas à fila de scraping." });
    } catch (error) {
      console.error("[scrapeController] Erro:", error);
      throw error;
    }
  },
};

export { scrapeController };
