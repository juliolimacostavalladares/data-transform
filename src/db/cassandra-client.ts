import { Client } from "cassandra-driver";

async function createKeyspaceIfNotExist() {
  const createKeyspaceQuery = `
    CREATE KEYSPACE IF NOT EXISTS scraped_data 
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
  `;
  try {
    await client.execute(createKeyspaceQuery);
    console.log("Keyspace 'scraped_data' verificado/criado com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar/criar o keyspace 'scraped_data':", error);
    throw error;
  }
}

const client = new Client({
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
});

async function connectToCassandra() {
  try {
    await client.connect();
    console.log("Conexão com o Cassandra estabelecida com sucesso!");

    await createKeyspaceIfNotExist();

    await client.execute("USE scraped_data");
    console.log("Usando o keyspace 'scraped_data'.");
  } catch (err) {
    console.error("Erro ao conectar ao Cassandra:", err);
  }
}

connectToCassandra();

export async function getRawDataFromCassandra(sqlQuery: string, params: any[]) {
  try {
    console.log("Executando consulta SQL:", sqlQuery);
    console.log("Parâmetros da consulta:", params);

    const result = await client.execute(sqlQuery, params, { prepare: true });
    return result.rows;
  } catch (error) {
    console.error("Erro ao buscar dados do Cassandra:", error);
    throw error;
  }
}

export async function closeCassandraConnection() {
  try {
    await client.shutdown();
    console.log("Conexão com o Cassandra fechada.");
  } catch (error) {
    console.error("Erro ao fechar a conexão com o Cassandra:", error);
  }
}

export default client;
