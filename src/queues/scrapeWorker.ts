import { scrapeQueue, dlq, saveQueue, aiQueue } from "../queues/scrapeQueue";
import { scrapeService } from "../services/scrapeService";
import { getRawDataFromCassandra } from "../db/cassandra-client";
import { PrismaClient } from "@prisma/client";
import { sendToClients } from "../services/ws";
import { Client } from "pg";
import { extractDataFromText } from "../services/ai";
import { Collection, saveExtractedDataToPostgres } from "../db/postgres";

console.log("[scrapeWorker] Iniciando...");

const prisma = new PrismaClient();
scrapeQueue.process(50, async (job) => {
  const { url, extractionName, userId, sourceType, sourceName } = job.data;

  try {
    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });
    if (!user) throw new Error(`Usuário não encontrado: ${userId}`);

    const scrapedData = await scrapeService.scrapePage(url);

    const referenceTable = `${extractionName}${user.id}`
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const enrichedData = {
      ...scrapedData,
      source_type: sourceType,
      source_name: sourceName,
      scraped_at: new Date().toISOString(),
    };

    const extraction = await prisma.extraction.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: extractionName,
        },
      },
      create: {
        name: extractionName,
        referenceTable,
        status: "PROCESSING",
        userId: user.id,
      },
      update: {
        referenceTable,
        status: "PROCESSING",
      },
    });

    await saveQueue.add({
      data: enrichedData,
      extractionId: extraction.id,
      referenceTable,
      userId: user.id,
    });
  } catch (error) {
    console.error(`[scrapeQueue] Erro:`, error);
    await dlq.add({ ...job.data, error: error });
    throw error;
  }
});

saveQueue.process(20, async (job) => {
  const { data, extractionId, referenceTable } = job.data;

  try {
    await scrapeService.saveScrapedData(referenceTable, [data]);

    await prisma.extraction.update({
      where: { id: extractionId },
      data: { status: "DONE" },
    });
  } catch (error) {
    console.error(`[saveQueue] Erro:`, error);

    await prisma.extraction.update({
      where: { id: extractionId },
      data: { status: "ERROR" },
    });

    throw error;
  }
});

aiQueue.process(50, async (job) => {
  const { extractionId, databaseId } = job.data;

  try {
    const extraction = await prisma.extraction.findUnique({
      where: { id: extractionId },
      include: {
        user: {
          include: {
            databases: {
              where: { id: databaseId },
            },
          },
        },
      },
    });

    if (!extraction) {
      throw new Error(`Extração ${extractionId} não encontrada`);
    }

    const database = extraction.user.databases[0];
    if (!database) {
      throw new Error(
        `Banco de dados ${databaseId} não encontrado para o usuário`
      );
    }

    console.log(
      `[aiQueue] Processando extração ${extraction.referenceTable} do banco ${database.name}`
    );

    sendToClients({
      status: "start",
      message: "Iniciando extração de dados...",
      isLoading: true,
    });

    const rawRecords = await getRawDataFromCassandra(
      `SELECT * FROM ${extraction.referenceTable} LIMIT 40`,
      []
    );

    const processedRecords = [];
    for (const [index, record] of rawRecords.entries()) {
      try {
        if (!database.collections || !Array.isArray(database.collections)) {
          throw new Error("Estrutura de collections inválida ou ausente.");
        }

        const collections = database.collections as Collection[];
        const extractedData = await extractDataFromText(
          collections,
          record.text || record.html || "",
          record.link || ""
        );

        console.log(`[aiQueue] Registro ${index} processado:`);

        processedRecords.push({
          ...record,
          extractedData,
          processedAt: new Date().toISOString(),
        });

        const collectionName = collections[0].name;

        // 🔐 NOVO: valida apenas os campos válidos da collection
        const validFieldNames = collections[0].fields.map((f) => f.name);
        const cleanedData = Object.fromEntries(
          Object.entries(extractedData).filter(([key]) =>
            validFieldNames.includes(key)
          )
        );

        await saveExtractedDataToPostgres(
          database.dbNameReference,
          collectionName,
          cleanedData
        );

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Erro ao processar registro ${index}:`, error);

        processedRecords.push({
          ...record,
          error: error instanceof Error ? error.message : String(error),
          processedAt: new Date().toISOString(),
        });

        // Não relança o erro para não travar o processamento
        continue;
      }
    }

    await saveProcessedResults(extraction.id, processedRecords);

    await prisma.extraction.update({
      where: { id: extractionId },
      data: { status: "DONE" },
    });
  } catch (error) {
    console.error("[aiQueue] Erro no processamento:", error);

    if (extractionId) {
      await prisma.extraction.update({
        where: { id: extractionId },
        data: { status: "ERROR" },
      });
    }

    sendToClients({
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido",
      isLoading: false,
    });

    throw error;
  }
});

async function saveProcessedResults(extractionId: string, records: any[]) {
  console.log(`Salvando ${records.length} registros processados`);
}

dlq.process(2, async (job) => {
  const { url, extractionName, userId, sourceType, sourceName, error } =
    job.data;

  console.error(`[DLQ] Erro anterior:`, error);

  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await scrapeQueue.add({
      url,
      extractionName,
      userId,
      sourceType,
      sourceName,
    });
  } catch (retryError) {
    console.error(`[DLQ] Falha ao reenviar:`, retryError);
    throw retryError;
  }
});

console.log("[scrapeWorker] Aguardando tarefas...");
