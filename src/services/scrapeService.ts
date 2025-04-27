import puppeteer, { Browser } from "puppeteer";
import client from "../db/cassandra-client";
import { randomUUID } from "node:crypto";

let browser: Browser | null = null;

const scrapeService = {
  async startBrowser() {
    console.log("[scrapeService] Iniciando o navegador...");
    if (!browser) {
      try {
        console.log("[scrapeService] Browser não existe, iniciando...");
        browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--window-size=1920,1080",
          ],
        });
        console.log("[scrapeService] Navegador iniciado com sucesso.");
      } catch (error) {
        console.error("[scrapeService] Erro ao iniciar o navegador:", error);
        throw new Error("Falha ao iniciar o navegador.");
      }
    } else {
      console.log("[scrapeService] Navegador já está em execução.");
    }
    return browser;
  },

  async scrapePage(url: string) {
    console.log(`[scrapeService] Iniciando o scraping da URL: ${url}`);
    const page = await (await this.startBrowser()).newPage();

    page.setRequestInterception(true);
    page.on("request", (request) => {
      const type = request.resourceType();
      if (
        type === "image" ||
        type === "stylesheet" ||
        type === "font" ||
        type === "script"
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      console.log(`[scrapeService] Navegando até a URL: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Obtendo o HTML bruto da página
      const html = await page.evaluate(() => {
        return document.body.innerText;
      });

      console.log(`[scrapeService] Scraping concluído para a URL: ${url}`);
      await page.close();

      return {
        html,
        link: url,
        scraped_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[scrapeService] Erro ao scraping a URL ${url}:`, error);
      throw new Error(`Falha ao scraping a URL: ${url}`);
    }
  },

  validateScrapedData(
    data: {
      html: string;
      link: string;
      scraped_at: string;
      source_type?: string;
      source_name?: string;
    }[]
  ) {
    return data.filter((item) => item.html && item.link);
  },

  sanitizeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  },

  async createTableForCollection(collectionId: string) {
    if (typeof collectionId !== "string" || collectionId.trim().length === 0) {
      throw new Error("Collection ID inválido. Deve ser uma string não vazia.");
    }

    const validCollectionId = this.sanitizeTableName(collectionId);

    const query = `
      CREATE TABLE IF NOT EXISTS scraped_data.${validCollectionId} (
        id UUID PRIMARY KEY,
        html TEXT,
        link TEXT,
        scraped_at TIMESTAMP,
        source_type TEXT,
        source_name TEXT
      );
    `;

    await client.execute(query, [], { prepare: true });
    console.log(
      `[scrapeService] Tabela '${validCollectionId}' criada com sucesso.`
    );
  },

  async saveScrapedData(
    collectionId: string,
    data: {
      html: string;
      link: string;
      scraped_at: string;
      source_type?: string;
      source_name?: string;
    }[]
  ) {
    console.log(
      `[scrapeService] Iniciando a inserção de dados no banco de dados na tabela ${this.sanitizeTableName(
        this.sanitizeTableName(collectionId)
      )}. Total de ${data.length} itens.`
    );

    const validData = this.validateScrapedData(data);
    if (validData.length === 0) {
      console.log("[scrapeService] Nenhum dado válido para salvar.");
      return;
    }

    const validCollectionId = this.sanitizeTableName(collectionId);

    await this.createTableForCollection(validCollectionId);

    const batchSize = 50;
    const queries: { query: string; params: any[] }[] = [];
    let batchCount = 0;

    for (const item of validData) {
      queries.push({
        query: `
          INSERT INTO scraped_data.${validCollectionId} 
          (id, html, link, scraped_at, source_type, source_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        params: [
          randomUUID(),
          item.html,
          item.link,
          item.scraped_at,
          item.source_type || null,
          item.source_name || null,
        ],
      });

      if (queries.length >= batchSize) {
        try {
          console.log(
            `[scrapeService] Executando batch insert #${batchCount + 1} com ${
              queries.length
            } operações.`
          );
          await client.batch(queries, { prepare: true });
          console.log(
            `[scrapeService] Batch #${batchCount + 1} inserido com sucesso.`
          );
          batchCount++;
        } catch (error) {
          console.error(
            "[scrapeService] Erro ao inserir dados no banco de dados:",
            error
          );
          throw new Error("Falha ao inserir dados no banco.");
        }
        queries.length = 0;
      }
    }

    if (queries.length > 0) {
      try {
        console.log(
          `[scrapeService] Executando último batch insert com ${queries.length} operações.`
        );
        await client.batch(queries, { prepare: true });
        console.log("[scrapeService] Último batch inserido com sucesso.");
      } catch (error) {
        console.error(
          "[scrapeService] Erro ao inserir último batch no banco de dados:",
          error
        );
        throw new Error("Falha ao inserir último batch no banco.");
      }
    }

    console.log(`[scrapeService] Inserção de dados concluída.`);
  },

  async closeBrowser() {
    if (browser) {
      console.log("[scrapeService] Fechando o navegador...");
      await browser.close();
      browser = null;
      console.log("[scrapeService] Navegador fechado com sucesso.");
    } else {
      console.log("[scrapeService] Nenhum navegador para fechar.");
    }
  },
};

export { scrapeService };
