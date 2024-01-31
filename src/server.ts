import express from "express";
import cors from "cors";
import { SlackMessageResponse, SlackRequest, slackBot } from "./slack";
import { ShinkaiManager } from "./shinkai_manager";

export class WebServer {
  private app: express.Application;
  private shinkaiManager: ShinkaiManager;

  constructor(shinkaiManager: ShinkaiManager) {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.shinkaiManager = shinkaiManager;

    this.app.post("/slack", async (req: any, res: any) => {
      try {
        const requestBody = req.body as SlackRequest;
        const message = requestBody.text;

        console.log(requestBody);

        let threadId = "";
        if (message) {
          // Post the message to the thread (initializing thread, so we know where to push the response of the job)
          // Otherwise app has no idea what is the thread to which the reply should be posted later
          const statusInfoMessage = `Shinkai job created based on "${message}. Reply from the node will appear in the thread."`;
          const initialMessage = (await slackBot.postMessageToChannel(
            requestBody.channel_id,
            statusInfoMessage
          )) as SlackMessageResponse;

          // make sure we have thread
          if (initialMessage.ts === undefined || initialMessage.ts === null) {
            throw new Error(
              `Couldn't identify thread for reply. thread_ts: ${initialMessage.ts}`
            );
          }

          threadId = initialMessage.ts;

          // create shinkai job
          let job_id = await shinkaiManager.createJob("main/agent/my_gpt");
          console.log("### Job ID:", job_id);

          // send job message to the node
          let answer = await shinkaiManager.sendMessage(message, job_id);
          console.log("### Answer:", answer);

          // TODO: get last_messages_from_inbox for specific job_id, to show the answer from the node in Slack thread

          // reply to question to specific thread where the first job was made
          let jobResponse = `Reply from the node: ${answer}`;
          const slackBotResponse = await slackBot.postMessageToThread(
            requestBody.channel_id,
            initialMessage.ts,
            jobResponse
          );

          if (slackBotResponse instanceof Error) throw slackBotResponse;

          return res.status(200).send({
            status: "success",
            message: `Job ${job_id} executed successfully`,
          });
        } else {
          throw new Error(
            `${message} was not provided. Nothing to pass to the node.`
          );
        }
      } catch (err) {
        console.error(err);

        const error = err as Error;
        return res
          .status(400)
          .send({ status: "error", message: error.message });
      }
    });

    this.app.get("/health", async (req: any, res: any) => {
      try {
        // TODO: add necessary health checks (if service has access to the node & slack setup)
        return res.status(200).send({
          status: "success",
          message: `Shinkai Slack backend is up and running.`,
        });
      } catch (err) {
        const error = err as Error;
        console.error(error.message);
        return res.status(400).send({
          status: "error",
          message: error.message,
        });
      }
    });
  }

  start(port: number) {
    this.app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}
