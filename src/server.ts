import express from "express";
import cors from "cors";
import { SlackBot, SlackMessageResponse, SlackRequest } from "./slack";
import { ShinkaiManager } from "./shinkai_manager";
import axios from "axios";
import crypto from "crypto";
import { config } from "./config";

interface SlackEventApiRequestBody {
  token: string;
  challenge: string;
  type: string;
}

// middleware for verifying slack incoming messages
const verifySlackRequest = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    console.log("Skipping Slack request verification in test environment.");
    return next();
  }

  try {
    const signingSecret = config.slackSigningKey;

    const requestSignature = req.headers["x-slack-signature"];
    const requestTimestamp = req.headers["x-slack-request-timestamp"];

    const requestBodyString = Object.entries(req.body)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`
      )
      .join("&");
    const sigBaseString = `v0:${requestTimestamp}:${requestBodyString}`;

    // implementation based on official Slack docs: https://api.slack.com/authentication/verifying-requests-from-slack
    const mySignature =
      `v0=` +
      crypto
        .createHmac("sha256", signingSecret)
        .update(sigBaseString, "utf8")
        .digest("hex");

    if (
      crypto.timingSafeEqual(
        Buffer.from(mySignature, "utf8"),
        Buffer.from(requestSignature, "utf8")
      )
    ) {
      next();
    } else {
      throw new Error("Couldn't verify slack request headers.");
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send("Slack verification failed.");
  }
};

export class WebServer {
  public app: express.Application;
  private shinkaiManager: ShinkaiManager;
  private slackBot: SlackBot;

  // the purpose of this is to allow parallelisation, so end user can perform multiple jobs (for example ask questions)
  // and the node will reply to all of those in parallel manner - hence we need to store the ones we didn't get answers to
  // Once we get answer/response from the node in the inbox to specific job, we know to which thread we should post it and then we remove this job from the array
  constructor(shinkaiManager: ShinkaiManager, slackBot: SlackBot) {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.shinkaiManager = shinkaiManager;
    this.slackBot = slackBot;

    this.app.post("/slack", verifySlackRequest, async (req: any, res: any) => {
      try {
        const requestBody = req.body as SlackRequest;
        const message = requestBody.text;

        let threadId = "";

        if (message) {
          // Post the message to the thread (initializing thread, so we know where to push the response of the job)
          // Otherwise app has no idea what is the thread to which the reply should be posted later
          const statusInfoMessage = `Shinkai job created based on "${message}. Reply from the node will appear in the thread."`;
          const initialMessage = (await this.slackBot.postMessageToChannel(
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
          let jobId = await shinkaiManager.createJob("main/agent/my_gpt");
          console.log("### Job ID:", jobId);

          shinkaiManager.activeJobs.push({
            message: message,
            slackThreadId: threadId,
            slackChannelId: requestBody.channel_id,
            shinkaiJobId: jobId,
          });

          // send job message to the node
          let answer = await shinkaiManager.sendMessage(message, jobId);
          console.log("### Answer:", answer);

          const initialSlackMessage = `Job sent to the node jobId: ${jobId}. Response will be posted once node resolves it shortly.`;

          // we need to inform slack about successfull action immediately otherwise we run into timeout (sending 200 is enough)
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

    // Endpoint for handling Event API (so we can use mentions)
    this.app.post("/slack/events", async (req: any, res: any) => {
      try {
        // console.log(req);
        console.log(req.body);
        const requestBody = req.body as SlackEventApiRequestBody;

        // we need to inform slack about successfull action immediately otherwise we run into timeout (sending 200 is enough)
        return res.status(200).send({
          token: requestBody.token,
          challenge: requestBody.challenge,
          type: requestBody.type,
          // response_type: "in_channel",
        });
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
        const shinkaiHealthUrl = `${process.env.SHINKAI_NODE_URL}/v1/shinkai_health`;

        const healthResponse = await axios.get(shinkaiHealthUrl);
        if (
          healthResponse.status === 200 &&
          healthResponse.data.status === "ok"
        ) {
          console.log("Shinkai node is healthy.");
        } else {
          throw new Error("Shinkai node health check failed.");
        }

        return res.status(200).send({
          status: "success",
          message: `Shinkai Slack backend is up and running.`,
        });
      } catch (err) {
        const error = err as Error;
        console.error(error.message);
        return res.status(400).send({
          status: "error",
          message: `Error for: ${error.message}`,
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
