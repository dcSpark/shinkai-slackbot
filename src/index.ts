import { ShinkaiManager } from "./shinkai_manager";
import { WebServer } from "./server";
import { config } from "./config";
import { PersistenStorage, delay } from "./utils";
import { SlackBot } from "./slack";

import storage from "node-persist";

async function main() {
  const shinkaiManager: ShinkaiManager = new ShinkaiManager(
    config.encryptionSk,
    config.signatureSk,
    config.receiverPk,
    config.nodeName,
    config.profileName,
    config.deviceName
  );

  // load persistent storage (use persistent store to remember thread<>shinkai job mappings to keep the context of the conversation within slack threads)
  await storage.init();
  let threadJobMapping: { [threadId: string]: string };
  try {
    threadJobMapping = await storage.getItem(PersistenStorage.ThreadJobMapping);
  } catch (err) {
    const error = err as Error;
    console.log(`Couldn't load error message ${error.message}`);
  }

  const slackBot = new SlackBot();
  const server = new WebServer(shinkaiManager, slackBot, threadJobMapping);
  server.start(Number(process.env.PORT) ?? 3001);

  shinkaiManager
    .getNodeResponses(slackBot)
    .then(() => console.log("Message response fetcher was started."))
    .catch(() => console.error("Node response fetcher was stopped."));
}

main();
