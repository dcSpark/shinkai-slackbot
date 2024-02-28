import {
  InboxName,
  JobScope,
  MessageSchemaType,
  ShinkaiMessage,
  ShinkaiMessageBuilder,
  TSEncryptionMethod,
} from "@shinkai_protocol/shinkai-typescript-lib";
import { delay, postData } from "./utils";
import { WebAPICallResult } from "@slack/web-api";
import { SlackBot } from "./slack";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";

interface SlackJobAssigned {
  message: string;
  shinkaiJobId: string;
  startTimestamp?: number;

  // This is only related to Slack integration itself, but we need to know where the response should be sent
  slackChannelId?: string;
  slackThreadId?: string;
}

// Added only for benchmarking purposes
interface ArchiveJobsAnalytics {
  parentJob: JobAnalytics;
  followingJobs: JobAnalytics[];
}

interface JobAnalytics {
  jobId: string;
  message: string;
  executedTimestamp: number;
  nodeResponse?: string;
  id?: string;
}

export class ShinkaiManager {
  private encryptionSecretKey: Uint8Array;
  private signatureSecretKey: Uint8Array;
  private receiverPublicKey: Uint8Array;
  private shinkaiName: string;
  private profileName: string;
  private deviceName: string;

  public activeJobs: SlackJobAssigned[] = [];
  public archiveJobsAnalytics?: ArchiveJobsAnalytics[] = [];

  constructor(
    encryptionSK: string,
    signatureSK: string,
    receiverPK: string,
    shinkaiName: string,
    profileName: string,
    deviceName: string
  ) {
    console.log("--------------------------------------------------");
    console.log("ShinkaiManager Parameters (excluding keys):");
    console.log("Shinkai Name:", shinkaiName);
    console.log("Profile Name:", profileName);
    console.log("Device Name:", deviceName);
    console.log("--------------------------------------------------");

    this.encryptionSecretKey = new Uint8Array(Buffer.from(encryptionSK, "hex"));
    this.signatureSecretKey = new Uint8Array(Buffer.from(signatureSK, "hex"));
    this.receiverPublicKey = new Uint8Array(Buffer.from(receiverPK, "hex"));

    this.shinkaiName = shinkaiName;
    this.profileName = profileName;
    this.deviceName = deviceName;
  }

  async buildJobMessage(messageContent: string, job_id: string): Promise<any> {
    return await ShinkaiMessageBuilder.jobMessage(
      job_id,
      messageContent,
      "",
      "",
      this.encryptionSecretKey,
      this.signatureSecretKey,
      this.receiverPublicKey,
      this.shinkaiName,
      this.profileName,
      this.shinkaiName,
      ""
    );
  }

  async buildCreateJob(agent: string): Promise<ShinkaiMessage> {
    const job_scope: any = {
      local: [],
      vector_fs: [],
    };

    return await ShinkaiMessageBuilder.jobCreation(
      job_scope,
      this.encryptionSecretKey,
      this.signatureSecretKey,
      this.receiverPublicKey,
      this.shinkaiName,
      this.profileName,
      this.shinkaiName,
      agent
    );
  }

  async buildGetMessagesForInbox(inbox: string): Promise<any> {
    const messageBuilder = new ShinkaiMessageBuilder(
      this.encryptionSecretKey,
      this.signatureSecretKey,
      this.receiverPublicKey
    );

    await messageBuilder.init();
    return messageBuilder
      .set_message_raw_content(
        JSON.stringify({ inbox: inbox, count: 10, offset: null })
      )
      .set_body_encryption(TSEncryptionMethod.None)
      .set_message_schema_type(MessageSchemaType.APIGetMessagesFromInboxRequest)
      .set_internal_metadata_with_inbox(
        this.profileName,
        "",
        inbox,
        TSEncryptionMethod.None
      )
      .set_external_metadata_with_intra_sender(
        this.shinkaiName,
        this.shinkaiName,
        this.profileName
      )
      .build();
  }

  public async sendMessage(content: string, job_id: string) {
    const message_job = await this.buildJobMessage(content, job_id);

    let resp = await postData(message_job, "/v1/job_message");

    if (resp.status === "success") {
      return resp.data;
    } else {
      throw new Error(`Job creation failed:: ${resp}`);
    }
  }

  // right now we just support question -> answer/response
  // in multiple requests per job, we need to always find the last message in the array
  public async getMessages(jobId: string) {
    try {
      const inbox = InboxName.getJobInboxNameFromParams(jobId).value;
      const message = await this.buildGetMessagesForInbox(inbox);
      let resp = await postData(message, "/v1/last_messages_from_inbox");

      if (resp.data.length === 1) {
        console.log("There's no answer available yet.");
        return "";
      }

      // we only care about the latest response
      const latestMessage = resp.data[resp.data.length - 1];
      const isJobMessage =
        // message we're interested in has specific JobMessageSchema
        latestMessage.body.unencrypted.message_data.unencrypted
          .message_content_schema === MessageSchemaType.JobMessageSchema &&
        // sender_subidentity is empty for responses from the node
        latestMessage.body.unencrypted.internal_metadata.sender_subidentity ===
          "";

      if (isJobMessage) {
        const parsedMessage = JSON.parse(
          resp.data[resp.data.length - 1].body.unencrypted.message_data
            .unencrypted.message_raw_content
        );
        return parsedMessage?.content ?? "";
      }
    } catch (err) {
      const error = err as Error;
      console.error(error.message);
    }

    return "";
  }

  public async createJob(agent: string) {
    const jobMessage = await this.buildCreateJob(agent);

    let resp = await postData(JSON.stringify(jobMessage), "/v1/create_job");

    if (resp.status === "success") {
      return resp.data;
    } else {
      throw new Error(`Job creation failed: ${resp}`);
    }
  }

  public getNodeResponses = async (
    slackBot?: SlackBot
  ): Promise<string | undefined> => {
    // once request about the job is saved in activeJobs, we want to monitor status of this and clear activeJobs position once job is resolved
    // also if the job is resolved thanks to activeJobs, we can post answer on Slack to specific threads
    while (true) {
      if (this.activeJobs.length === 0) {
        await delay(1_000);
        continue;
      }
      console.log(
        `Number of active jobs awaiting for response: ${this.activeJobs.length}`
      );
      for (const job of this.activeJobs) {
        try {
          let nodeResponse = await this.getMessages(job.shinkaiJobId);

          // true by default, because if we don't wait for confirmation from another service (like Slack), we don't care about this condition
          let wasMessagePostedInExternalService = true;
          if (nodeResponse) {
            // waiting for external service confirmation that the message was posted to where it supposed to
            // for further integrations this part can be replaced/adjusted to whatever service we're integrating with
            if (slackBot !== undefined) {
              let wasMessagePostedInExternalService = false;
              const slackMessageResponse = (await slackBot.postMessageToThread(
                job.slackChannelId,
                job.slackThreadId,
                nodeResponse
              )) as WebAPICallResult;

              if (slackMessageResponse.ok) {
                wasMessagePostedInExternalService = true;
              }
            }

            if (wasMessagePostedInExternalService) {
              // Remove job from activeJobs once processed
              this.activeJobs = this.activeJobs.filter(
                (j) => j.shinkaiJobId !== job.shinkaiJobId
              );

              // added only for analytics
              const existingParentIndex = this.archiveJobsAnalytics.findIndex(
                (analytics) => analytics.parentJob.jobId === job.shinkaiJobId
              );

              console.log(`existingParentIndex: ${existingParentIndex}`);

              const jobAnalytics: JobAnalytics = {
                jobId: job.shinkaiJobId,
                message: job.message,
                nodeResponse: nodeResponse,
                executedTimestamp:
                  (Date.now() - (job.startTimestamp ?? 0)) / 1000,
                id: uuidv4(),
              };

              console.log(jobAnalytics);

              if (existingParentIndex !== -1) {
                this.archiveJobsAnalytics[
                  existingParentIndex
                ].followingJobs.push(jobAnalytics);
              } else {
                this.archiveJobsAnalytics.push({
                  parentJob: jobAnalytics,
                  followingJobs: [],
                });
              }
            }
          }
        } catch (error) {
          console.log(`Response for jobId: ${job.shinkaiJobId} not available`);
        }
      }

      // set the delay based on how often we expect responses to resolve on the node
      await delay(1000);
    }
  };

  // return jobId, so we can store it later
  // single function to create job and send it to the node
  public createJobAndSend = async (
    message: string,
    existingJobId?: string
  ): Promise<string | undefined> => {
    try {
      let jobId: string = "";
      if (existingJobId !== undefined) {
        console.log(`Using already existing job id ${existingJobId}`);
        jobId = existingJobId;
      } else {
        // create shinkai job
        console.log(`Creating joxb id`);
        jobId = await this.createJob(config.agent);
      }
      console.log("### Job ID:", jobId);

      // send job message to the node
      let answer = await this.sendMessage(message, jobId);
      this.activeJobs.push({
        message: message,
        shinkaiJobId: jobId,
        startTimestamp: Date.now(),
      });
      console.log("### Answer:", answer);

      return jobId;
    } catch (err) {
      const error = err as Error;
      console.error(error.message);
    }
    return;
  };
}
