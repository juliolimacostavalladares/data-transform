import { Request, Response } from "express";
import { aiQueue } from "../queues/scrapeQueue";
import { PrismaClient } from "@prisma/client";
import { exportDataBase } from "../db/postgres";
import { asyncHandler } from "../utils/asyncHandler";

const prisma = new PrismaClient();

async function processData(req: Request, res: Response) {
  const { extractionId, databaseId, userId } = req.body;

  console.log({ extractionId, databaseId, userId });

  try {
    await aiQueue.add({
      extractionId,
      databaseId,
      userId,
    });

    res.json({ message: "Tarefa adicionada à fila com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar tarefa à fila:", error);
    res.status(500).json({ error: "Erro ao adicionar tarefa à fila" });
  }
}

const collections = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const collections = await prisma.extraction.findMany({
    where: {
      user: {
        externalId: userId,
      },
    },
  });

  res.status(200).send(collections);
});

const exportData = asyncHandler(async (req: Request, res: Response) => {
  const { databaseId, userId } = req.body;

  const database = await prisma.database.findFirst({
    where: {
      id: databaseId,
      user: {
        externalId: userId,
      },
    },
  });

  if (!database) {
    return res.status(404).json({
      error: "Banco de dados não encontrado ou não pertence ao usuário",
    });
  }

  const tableName = (() => {
    const item = (database.collections as any)?.[0];
    if (item?.name) return item.name;
    throw new Error("Formato inválido em 'collections'");
  })();

  const exportedDataCSV = await exportDataBase(
    database.dbNameReference,
    tableName
  );

  if (!exportedDataCSV) {
    return res
      .status(404)
      .json({ error: "Nenhum dado encontrado para exportação." });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${tableName}.csv"`
  );

  res.status(200).send(exportedDataCSV);
});

export { processData, exportData, collections };
