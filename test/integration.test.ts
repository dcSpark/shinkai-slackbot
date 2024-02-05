import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import { WebServer } from "../src/server";
import { ShinkaiManager } from "../src/shinkai_manager";

import { config } from "../src/config";
import { SlackBot } from "../src/slack";

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
    webServer.start(3001);
  });

  describe("/slack endpoint", () => {
    it("should successfully post a message to slack and create a job", async () => {
      const response = await request(webServer.app).post("/slack").send({
        text: "[INTEGRATION TEST RUNNING 2342134532]. What is integration testss?",
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

  afterAll(() => {
    // TODO: close the node if initial setup is possible
  });
});
