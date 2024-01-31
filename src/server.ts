import express from "express";
import cors from "cors";
import { SlackMessageResponse, SlackRequest, slackBot } from "./slack";
import { ShinkaiManager } from "./shinkai_manager";

export class WebServer {
  private app: express.Application;
  private shinkaiManager: ShinkaiManager;

  // the purpose of this is to allow parallelisation, so end user can perform multiple jobs (for example ask questions)
  // and the node will reply to all of those in parallel manner - hence we need to store the ones we didn't get answers to
  // Once we get answer/response from the node in the inbox to specific job, we know to which thread we should post it and then we remove this job from the array

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
          // TODO: make name of the agent configurable (it should be `main/agent/{name_of_the_agent}`)
          let jobId = await shinkaiManager.createJob("main/agent/my_gpt");
          console.log("### Job ID:", jobId);

          shinkaiManager.activeJobs.push({
            message: message,
            parentThreadId: threadId,
            jobId: jobId,
          });

          console.log(shinkaiManager.activeJobs.length);
          console.log(shinkaiManager.activeJobs);

          // send job message to the node
          let answer = await shinkaiManager.sendMessage(message, jobId);
          console.log("### Answer:", answer);

          const initialSlackMessage = `Job sent to the node jobId: ${jobId}. Response will be posted once node resolves it shortly.`;
          // we need to inform slack about successfull action immediately otherwise we run into timeout
          // const slackBotResponse0 = await slackBot.postMessageToThread(
          //   requestBody.channel_id,
          //   initialMessage.ts,
          //   initialSlackMessage
          // );

          return res.status(200).send({
            status: "success",
            message: initialSlackMessage,
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
