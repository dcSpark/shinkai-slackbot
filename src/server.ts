import express from "express";
import cors from "cors";
import { SlackMessageResponse, SlackRequest, slackBot } from "./slack";
import { ShinkaiManager } from "./shinkai_manager";

interface SlackJobAssigned {
  message: string;
  parentThreadId: string;
  jobId: string;
}
export class WebServer {
  private app: express.Application;
  private shinkaiManager: ShinkaiManager;

  // the purpose of this is to allow parallelisation, so end user can perform multiple jobs (for example ask questions)
  // and the node will reply to all of those in parallel manner - hence we need to store the ones we didn't get answers to
  // Once we get answer/response from the node in the inbox to specific job, we know to which thread we should post it and then we remove this job from the array
  private activeJobs: SlackJobAssigned[] = [];

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

          this.activeJobs.push({
            message: message,
            parentThreadId: threadId,
            jobId: jobId,
          });

          // send job message to the node
          let answer = await shinkaiManager.sendMessage(message, jobId);
          console.log("### Answer:", answer);

          // TODO: get last_messages_from_inbox for specific job_id, to show the answer from the node in Slack thread
          let resp = await shinkaiManager.getMessages(
            "jobid_b71e1ea6-7860-4cb5-87f9-d08dac928089"
          );

          // TODO: implement 1&2 once happy path with answers is working
          // 1. Send message to the node
          // 2. Implement another function (that doesn't block the endpoint here), that monitors active jobs and sends responses to Slack App once node answers

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
            message: `Job ${jobId} executed successfully`,
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
