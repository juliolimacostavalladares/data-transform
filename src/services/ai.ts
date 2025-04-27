// ai.ts

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

type Field = {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
};

type Collection = {
  name: string;
  fields: Field[];
  primaryField: string;
};

export async function extractDataFromText(
  collections: Collection[],
  textContent: string,
  link: string
): Promise<{ [key: string]: string }> {
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error("Coleções inválidas.");
  }

  const collection = collections[0]; // Considerando apenas a primeira por enquanto
  const { fields } = collection;

  const prompt = `
Analise o seguinte conteúdo textual e extraia as informações solicitadas com base nas descrições fornecidas.

Conteúdo do campo 'text':
"${textContent}"

Conteúdo do campo 'link':
"${link}"

Campos esperados:
${fields.map((field) => `- ${field.name}: Tipo: ${field.type}`).join("\n")}

Instruções:
1. Analise o conteúdo do campo 'text' e identifique as informações correspondentes a cada campo.
2. Se um valor puder ser inferido com base no contexto ou conhecimento geral (ex: código IBGE, renda média), retorne o valor.
3. Caso o campo exija um cálculo (ex: P.A / Conservação), calcule e retorne o valor.
4. Caso o campo exija uma formatação específica (ex: moeda, porcentagem, datas padronizadas), aplique essa formatação.
5. Retorne um objeto JSON onde as chaves são os nomes dos campos e os valores são as informações extraídas.
6. Se uma informação não for encontrada, retorne:
   - 0, se o campo for numérico
   - "", se for string
   - false se for booleano
7. Nunca traga mais de um valor por campo. Caso haja múltiplas ocorrências, concatene com " - ".
8. Retorne APENAS o objeto JSON, sem explicações adicionais.
10  . Certifique-se de que o JSON retornado esteja corretamente formatado e válido.
10. Sempre que for um campo com valor de dinheiro retone em ex: (R$ 300.000,00) 
`;

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const { text: result } = await generateText({
        model: google("learnlm-1.5-pro-experimental"),
        prompt,
      });

      const jsonStart = result.indexOf("{");
      const jsonEnd = result.lastIndexOf("}") + 1;
      const jsonString = result.slice(jsonStart, jsonEnd);
      const extractedData = JSON.parse(jsonString);

      if (!extractedData || typeof extractedData !== "object") {
        throw new Error("Formato de dados inválido.");
      }
      console.log("Dados extraídos:", extractedData);
      return extractedData;
    } catch (error) {
      console.warn(`Tentativa falhou. Tentando novamente em ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
      retries--;
      if (retries === 0) {
        throw new Error(
          "Falha após várias tentativas. Verifique quota da API."
        );
      }
    }
  }

  throw new Error("Erro não identificado.");
}
