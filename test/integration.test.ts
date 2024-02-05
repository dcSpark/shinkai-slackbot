import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import { WebServer } from "../src/server";
import { ShinkaiManager } from "../src/shinkai_manager";

import { config } from "../src/config";
import { SlackBot } from "../src/slack";
import { delay } from "../src/utils";

// `Slack` trigger is to call `/slack` endpoint
describe("Integration Tests for WebServer Endpoints", () => {
  let webServer: WebServer;
  let shinkaiManager: ShinkaiManager;
  let slackBot: SlackBot;

  beforeAll(() => {
    // we assume node must be running in the background
    slackBot = new SlackBot(true);
    shinkaiManager = new ShinkaiManager(
      config.encryptionSk,
      config.signatureSk,
      config.receiverPk,
      config.nodeName,
      config.profileName,
      config.deviceName
    );
    webServer = new WebServer(shinkaiManager, slackBot);
    webServer.start(3002);
  });

  describe("/slack endpoint", () => {
    it("should successfully post a message to slack and create a job", async () => {
      const response = await request(webServer.app).post("/slack").send({
        text: "What is integration test?",
        channel_id: "project",
      });

      expect(response.body.status).toBe("success");
      const jobIdRegex =
        /Job sent to the node jobId: jobid_[a-z0-9-]+\. Response will be posted once node resolves it shortly\./;
      expect(response.body.message).toMatch(jobIdRegex);
    });
  });

  describe("/health endpoint", () => {
    it("should return success status", async () => {
      const response = await request(webServer.app).get("/health").expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe(
        "Shinkai Slack backend is up and running."
      );
    });
  });

  describe("Trigger Slack endpoint with AI prompts", () => {
    it("should trigger slack endpoint with AI prompt questions and verify pending messages", async () => {
      const prompts = [
        "What is the meaning of life?",
        "Explain the theory of relativity",
      ];

      let pendingMessagesAfter = shinkaiManager.activeJobs.length;
      for (const prompt of prompts) {
        const pendingMessagesBefore = shinkaiManager.activeJobs.length;
        // Trigger slack endpoint with the prompt
        await request(webServer.app).post("/slack").send({
          text: prompt,
          channel_id: "questions",
        });

        // Verify if message was added
        pendingMessagesAfter = shinkaiManager.activeJobs.length;

        // Ensure that the number of pending messages is not increasing unexpectedly
        expect(pendingMessagesBefore).toBeLessThanOrEqual(pendingMessagesAfter);
      }

      shinkaiManager.getNodeResponses(slackBot);

      await delay(25_000);

      const stillPendingMessages = shinkaiManager.activeJobs.length;
      expect(stillPendingMessages).toBeLessThan(pendingMessagesAfter);
    }, 40_000);

    afterAll(async () => {
      // Additional cleanup if necessary
    });
  });

  afterAll(() => {
    // TODO: close the node if initial setup is possible
  });
});
