import { DatabaseStatus, DbmsType, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { randomUUID } from "node:crypto";
import { createNewDatabase, Collection } from "../db/postgres";

const prisma = new PrismaClient();

export const getUserExtractionsAndDatabases = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: externalId } = req.params;

    const extractions = await prisma.extraction.findMany({
      where: {
        user: { externalId },
      },
      select: {
        id: true,
        name: true,
        referenceTable: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const databases = await prisma.database.findMany({
      where: {
        user: { externalId },
        status: { not: "DELETED" },
      },
      select: {
        id: true,
        name: true,
        description: true,
        dbmsType: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      extractions,
      databases,
    });
  }
);

export const listUserDatabases = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: externalId } = req.params;

    const databases = await prisma.database.findMany({
      where: {
        user: { externalId },
        status: { not: "DELETED" },
      },
      select: {
        id: true,
        name: true,
        description: true,
        dbmsType: false,
        status: true,
        collections: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(databases);
  }
);

export const createDatabase = asyncHandler(
  async (req: Request, res: Response) => {
    const { databaseName, userId, collections } = req.body as {
      databaseName: string;
      userId: string;
      collections: Collection[];
    };

    if (!databaseName || !userId || !collections) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        details: {
          databaseName: !databaseName
            ? "Nome do projeto é obrigatório"
            : undefined,
          userId: !userId ? "ID do usuário é obrigatório" : undefined,
          collections: !collections ? "Coleções são obrigatórias" : undefined,
        },
      });
    }

    if (!Array.isArray(collections)) {
      return res.status(400).json({
        error: "Coleções devem ser um array",
      });
    }

    const user = await prisma.user.findUnique({
      where: { externalId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const existingDatabase = await prisma.database.findFirst({
      where: {
        name: databaseName,
        userId: user.id,
      },
    });

    if (existingDatabase) {
      return res.status(409).json({
        error: "Já existe um projeto com este nome para o usuário",
      });
    }

    const databaseId = randomUUID();
    const dbNameReference = `${databaseName.replace(
      /\s+/g,
      "_"
    )}_${databaseId.replace(/-/g, "")}`;

    try {
      const database = await prisma.database.create({
        data: {
          id: databaseId,
          name: databaseName,
          dbmsType: DbmsType.POSTGRESQL,
          dbNameReference: dbNameReference,
          collections: collections,
          userId: user.id,
          status: DatabaseStatus.ACTIVE,
        },
      });

      const createdDbName = await createNewDatabase(
        dbNameReference,
        collections
      );

      await prisma.database.update({
        where: { id: databaseId },
        data: { status: DatabaseStatus.ACTIVE },
      });

      return res.status(201).json({
        id: database.id,
        name: database.name,
        dbReference: dbNameReference,
        status: DatabaseStatus.ACTIVE,
        message: `Projeto "${createdDbName.databaseName}" criado com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao criar projeto:", error);

      await prisma.database
        .deleteMany({
          where: {
            id: databaseId,
            status: DatabaseStatus.ACTIVE,
          },
        })
        .catch(() => {});

      return res.status(500).json({
        error: "Falha ao criar projeto",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }
);

export const getDatabase = asyncHandler(async (req: Request, res: Response) => {
  const { id: databaseId } = req.params;
  const { id: externalId } = req.params;

  const database = await prisma.database.findFirst({
    where: {
      id: databaseId,
      user: { externalId },
      status: { not: "DELETED" },
    },
  });

  if (!database) {
    return res.status(404).json({ error: "Banco de dados não encontrado" });
  }

  res.json(database);
});

export const updateDatabase = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: databaseId } = req.params;
    const { id: externalId } = req.params;
    const { name, description, status } = req.body;

    const database = await prisma.database.update({
      where: {
        id: databaseId,
        user: { externalId },
      },
      data: {
        name,
        description,
        status,
      },
    });

    res.json(database);
  }
);

export const deleteDatabase = asyncHandler(
  async (req: Request, res: Response) => {
    const { databaseId, externalId } = req.params;

    await prisma.database.update({
      where: {
        id: databaseId,
        user: { externalId },
      },
      data: {
        status: "DELETED",
      },
    });

    res.status(204).send();
  }
);
