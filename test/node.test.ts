import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import { WebServer } from "../src/server";
import { ShinkaiManager } from "../src/shinkai_manager";

import { config } from "../src/config";
import { delay } from "../src/utils";
import { execSync } from "child_process";
import * as path from "path";
import { SlackBot } from "../src/slack";

// `Slack` trigger is to call `/slack` endpoint
describe("Integration Tests for WebServer Endpoints", () => {
  let webServer: WebServer;
  let shinkaiManager: ShinkaiManager;

  beforeAll(async () => {
    const defaultNodeOptions = {
      FIRST_DEVICE_NEEDS_REGISTRATION_CODE: false,
      GLOBAL_IDENTITY_NAME: "@@localhost.shinkai",
      EMBEDDINGS_SERVER_URL: "https://internal.shinkai.com/x-embed-api/embed",
      UNSTRUCTURED_SERVER_URL: "https://internal.shinkai.com",
      NO_SECRET_FILE: true,
      NODE_STORAGE_PATH: path.join(__dirname, "./node/db"),
      NODE_PATH: path.join(__dirname, "./node/shinkai_node"),
      NODE_API_IP: "127.0.0.1",
      NODE_API_PORT: 9550,
    };

    const nodeOptionsToEnv = Object.entries(defaultNodeOptions)
      .map(([key, value]) => {
        return `${key}="${value}"`;
      })
      .join(" ");

    // TODO: use dockerized image of the node
    execSync(`${nodeOptionsToEnv} ${defaultNodeOptions.NODE_PATH}`, {
      stdio: "inherit",
    });

    await delay(10_000);

    shinkaiManager = new ShinkaiManager(
      config.encryptionSk,
      config.signatureSk,
      config.receiverPk,
      config.nodeName,
      config.profileName,
      config.deviceName
    );
    webServer = new WebServer(shinkaiManager, new SlackBot());
    webServer.start(3001);
  });

  it("should return success status", async () => {
    const response = await request(webServer.app).get("/health").expect(200);

    expect(response.body.status).toBe("success");
    expect(response.body.message).toBe(
      "Shinkai Slack backend is up and running."
    );
  });

  afterAll(() => {
    // Stop @shinkai_node service
    execSync("pkill -f shinkai_node", { stdio: "inherit" });
  });
});
