import {
  WebClient,
  WebAPICallResult,
  WebAPICallError,
  LogLevel,
} from "@slack/web-api";

import { config } from "./config";

export interface SlackRequest {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    bot_id: string;
    type: string;
    text: string;
    user: string;
    ts: string;
    app_id: string;
    blocks: any[];
    team: string;
    bot_profile: {
      id: string;
      app_id: string;
      name: string;
      icons: any;
      deleted: boolean;
      updated: number;
      team_id: string;
    };
  };
  response_metadata: {
    scopes: string[];
    acceptedScopes: string[];
  };
}

export class SlackBot {
  private token!: string;
  private client!: WebClient;
  private isTesting!: boolean;

  constructor(isTesting: boolean = false) {
    this.isTesting = isTesting || process.env.NODE_ENV === "test";
    const token = config.slackAppToken ?? "";
    if (!isTesting && (token === undefined || token === "")) {
      throw new Error(
        `SLACK_BOT_TOKEN env not defined. SLACK_BOT_TOKEN: ${token}`
      );
    }

    this.client = new WebClient(token, {
      logLevel: LogLevel.DEBUG,
      retryConfig: {
        maxRetryTime: 50000,
      },
    });
  }

  // Function to post a message to a specific channel
  public async postMessageToChannel(
    channelId: string,
    text: string
  ): Promise<WebAPICallResult | undefined> {
    console.log("this.isTesting");
    console.log(this.isTesting);
    if (this.isTesting) {
      return Promise.resolve({
        ok: true,
        channel: channelId,
        ts: 1234,
        message: {
          text: text,
        },
      });
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: text,
      });
      return result;
    } catch (error) {
      console.error(
        `Error posting message to channel: ${
          (error as WebAPICallError).message
        }`
      );
    }
  }

  // Function to post a message to a specific thread within a channel
  public async postMessageToThread(
    channelId: string,
    threadTs: string,
    text: string
  ): Promise<WebAPICallResult | Error> {
    if (this.isTesting) {
      return Promise.resolve({
        ok: true,
        channel: channelId,
        ts: "mock_thread",
        message: {
          text: text,
        },
      });
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: text,
      });

      if (result.ok) {
        console.log(
          `Response from the node: ${text} posted to channelId: ${channelId} successfully.`
        );
      }
      return result;
    } catch (error) {
      return new Error(
        `Error posting message to thread: ${(error as WebAPICallError).message}`
      );
    }
  }
}
