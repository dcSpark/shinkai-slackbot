import { ShinkaiManager } from "./shinkai_manager";

import dotenv from "dotenv";
dotenv.config();

import { WebServer } from "./server";

async function main() {
  const encryption_sk: string = process.env["encryption_sk"] || "";
  const signature_sk: string = process.env["signature_sk"] || "";
  const receiver_pk = process.env["receiver_pk"] || "";
  const profile_name = "main";
  const device_name = "main_device";
  const node_name = "@@localhost.shinkai";

  const shinkaiManager: ShinkaiManager = new ShinkaiManager(
    encryption_sk,
    signature_sk,
    receiver_pk,
    node_name,
    profile_name,
    device_name
  );

  const server = new WebServer(shinkaiManager);
  server.start(Number(process.env.PORT) ?? 3001);

  let job_id = await shinkaiManager.createJob("main/agent/my_gpt");
  console.log("### Job ID:", job_id);

  let answer = await shinkaiManager.sendMessage("What are you?", job_id);
  console.log("### Answer:", answer);

  // let resp = await shinkaiManager.getMessages(
  //   "jobid_b71e1ea6-7860-4cb5-87f9-d08dac928089"
  // );
}

main();
