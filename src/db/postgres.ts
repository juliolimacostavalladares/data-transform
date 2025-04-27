import { Client } from "pg";
import fs from "fs";
import path from "path";

type Field = {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
};

export type Collection = {
  name: string;
  fields: Field[];
  primaryField: string;
};

export async function createNewDatabase(
  databaseName: string,
  collections: Collection[]
): Promise<{
  success: boolean;
  databaseName: string;
  dataLabels: string[];
  fieldDescriptions: string[];
}> {
  if (!databaseName || typeof databaseName !== "string") {
    throw new Error("Nome do projeto inválido");
  }

  if (!Array.isArray(collections)) {
    throw new Error("Coleções devem ser um array");
  }

  const adminClient = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "data_collect",
  });

  try {
    await adminClient.connect();

    const dbExists = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName]
    );

    if (dbExists.rows.length > 0) {
      throw new Error(`O projeto '${databaseName}' já existe`);
    }

    await adminClient.query(`CREATE DATABASE "${databaseName}";`);

    const dbClient = new Client({
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: databaseName,
    });

    await dbClient.connect();
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const dataLabels: string[] = [];
    const fieldDescriptions: string[] = [];

    for (const collection of collections) {
      if (!collection || typeof collection !== "object") {
        console.error("Coleção inválida:", collection);
        continue;
      }

      await createCollection(dbClient, collection);

      for (const field of collection.fields) {
        dataLabels.push(field.name);
        const description = `${field.name} (${field.type}${
          field.required ? ", obrigatório" : ""
        }${field.defaultValue ? `, padrão: ${field.defaultValue}` : ""})`;
        fieldDescriptions.push(description);
      }
    }

    return { success: true, databaseName, dataLabels, fieldDescriptions };
  } catch (error) {
    console.error("Erro detalhado:", error);
    throw new Error(
      `Falha ao criar projeto: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  } finally {
    await adminClient.end().catch(console.error);
  }
}

export async function saveExtractedDataToPostgres(
  dbName: string,
  tableName: string,
  data: Record<string, any>
) {
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: dbName,
  });

  await client.connect();

  console.log(`[saveExtractedData] Name DB:`, dbName);

  const fields = Object.keys(data);
  const values = Object.values(data);

  const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
  const fieldNames = fields.map((f) => `"${f}"`).join(", ");

  const query = `
    INSERT INTO "${tableName}" (${fieldNames})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING;
  `;

  try {
    await client.query(query, values);
  } catch (err) {
    console.error(`[saveExtractedData] Falha ao salvar no Postgres:`, err);
    throw err;
  } finally {
    await client.end();
  }
}

export async function exportDataBase(
  dbName: string,
  tableName: string
): Promise<string> {
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: dbName,
  });

  await client.connect();

  const query = `SELECT * FROM "${tableName}"`;

  try {
    const result = await client.query(query);

    if (!result.rows || result.rows.length === 0) {
      console.warn("[exportData] Nenhum dado encontrado.");
      return "";
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(",")]; // Cabeçalhos

    // Dados
    for (const row of result.rows) {
      const line = headers
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return "";
          const str = String(value).replace(/"/g, '""'); // Escapa as aspas
          return `"${str}"`; // Corrige para valores entre aspas
        })
        .join(",");
      csvRows.push(line);
    }

    // Gera o conteúdo CSV
    const csvContent = csvRows.join("\n");

    return csvContent;
  } catch (err) {
    console.error("[exportData] Erro ao exportar dados:", err);
    throw err;
  } finally {
    await client.end();
  }
}

async function createCollection(client: Client, collection: Collection) {
  try {
    if (!collection.name || !collection.fields || !collection.primaryField) {
      throw new Error("Estrutura da coleção inválida");
    }

    const fieldsDef = collection.fields
      .map((field) => {
        if (!field.name || !field.type) {
          throw new Error("Campo inválido: nome e tipo são obrigatórios");
        }

        const sqlType = mapFieldTypeToSQL(field.type);

        let fieldSql = `"${field.name}" ${sqlType}`;

        if (field.required) fieldSql += " NOT NULL";
        if (field.defaultValue)
          fieldSql += ` DEFAULT ${formatDefaultValue(
            field.type,
            field.defaultValue
          )}`;
        if (field.name === collection.primaryField) fieldSql += " PRIMARY KEY";

        return fieldSql;
      })
      .join(", ");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "${collection.name}" (
        ${fieldsDef}
      );
    `);

    if (
      !collection.fields.some(
        (f) =>
          f.name === collection.primaryField &&
          f.defaultValue?.includes("uuid_generate")
      )
    ) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS "idx_${collection.name}_${collection.primaryField}"
        ON "${collection.name}" ("${collection.primaryField}");
      `);
    }

    console.log(`Coleção "${collection.name}" criada com sucesso`);
  } catch (error) {
    console.error(`Erro ao criar coleção ${collection.name}:`, error);
    throw error;
  }
}

function mapFieldTypeToSQL(fieldType: string): string {
  const typeMap: Record<string, string> = {
    text: "TEXT",
    number: "NUMERIC",
    boolean: "BOOLEAN",
    date: "DATE",
    image: "TEXT",
    url: "TEXT",
  };

  return typeMap[fieldType] || "TEXT";
}

function formatDefaultValue(fieldType: string, value: string): string {
  if (fieldType === "boolean") {
    return value === "true" ? "TRUE" : "FALSE";
  }
  if (fieldType === "number") {
    return value;
  }
  if (fieldType === "date") {
    return value === "CURRENT_DATE" ? "CURRENT_DATE" : `'${value}'`;
  }
  return `'${value}'`;
}
