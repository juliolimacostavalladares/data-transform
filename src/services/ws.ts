import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3002 });

let clients: Set<any> = new Set();

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado");
  clients.add(ws);

  ws.on("close", () => {
    console.log("Cliente desconectado");
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("Erro no WebSocket:", err);
    clients.delete(ws);
  });
});

export const sendToClients = (message: any) => {
  clients.forEach((client) => {
    client.send(JSON.stringify(message));
  });
};
