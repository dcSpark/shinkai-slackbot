import { ShinkaiManager } from "./shinkai_manager";
import { WebServer } from "./server";
import { config } from "./config";
import { delay } from "./utils";

async function main() {
  const shinkaiManager: ShinkaiManager = new ShinkaiManager(
    config.encryptionSk,
    config.signatureSk,
    config.receiverPk,
    config.nodeName,
    config.profileName,
    config.deviceName
  );

  const server = new WebServer(shinkaiManager);
  server.start(Number(process.env.PORT) ?? 3001);

  shinkaiManager
    .getNodeResponses()
    .then((response) => console.log("Message response fetcher was started."))
    .catch((err) => console.error("Node response fetcher was stopped."));

  // uncomment and create a loop to check node behaviour (to be removed)
  // let job_id = await shinkaiManager.createJob("main/agent/my_gpt");
  // console.log("### Job ID:", job_id);

  // let answer = await shinkaiManager.sendMessage("What are you?", job_id);
  // console.log("### Answer:", answer);

  // // await delay(20000);
  // let nodeResponse = await shinkaiManager.getMessages(job_id);
  // console.log(nodeResponse);
}

main();
