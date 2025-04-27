import Queue from "bull";

const queueOptions = {
  redis: {
    host: "localhost",
    port: 6379,
  },
};

const scrapeQueue = new Queue("scrapeQueue", queueOptions);
const dlq = new Queue("scrapeDLQ", queueOptions);
const saveQueue = new Queue("saveQueue", queueOptions);
const aiQueue = new Queue("ai-queue", queueOptions);
const exportData = new Queue("export-data-queue", queueOptions);

export { scrapeQueue, dlq, saveQueue, aiQueue, exportData };
