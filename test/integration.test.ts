import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import { WebServer } from "../src/server";
import { ShinkaiManager } from "../src/shinkai_manager";

import { config } from "../src/config";
import { slackBot } from "../src/slack";

// `Slack` trigger is to call `/slack` endpoint

describe("Integration Tests for WebServer Endpoints", () => {
  let webServer: WebServer;
  let shinkaiManager: ShinkaiManager;

  beforeAll(() => {
    // TODO (ideally): Start shinkai node
    // TODO: identify if we can get keys from the node automatically & if not then assume node must be running in the background
    // execSync("sh scripts/run_node1.sh", { stdio: "inherit" });

    shinkaiManager = new ShinkaiManager(
      config.encryptionSk,
      config.signatureSk,
      config.receiverPk,
      config.nodeName,
      config.profileName,
      config.deviceName
    );
    webServer = new WebServer(shinkaiManager);
    webServer.start(3001);
  });

  describe("/slack endpoint", () => {
    it("should successfully post a message to slack and create a job", async () => {
      const response = await request(webServer.app).post("/slack").send({
        text: "[INTEGRATION TEST RUNNING]. What is integration test?",
        channel_id: "project",
      });

      expect(response.body.status).toBe("success");
      const jobIdRegex =
        /Job sent to the node jobId: jobid_[a-z0-9-]+\. Response will be posted once node resolves it shortly\./;
      expect(response.body.message).toMatch(jobIdRegex);
    });

    it("should return an error if message text is not provided", async () => {
      const response = await request(webServer.app)
        .post("/slack")
        .send({
          channel_id: "nonExistingChannel",
        })
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe(
        "undefined was not provided. Nothing to pass to the node."
      );
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
