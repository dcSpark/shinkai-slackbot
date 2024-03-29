import request from "supertest";
import { describe } from "@jest/globals";
import { WebServer } from "../src/server";
import { ShinkaiManager } from "../src/shinkai_manager";

import { config } from "../src/config";
import { SlackBot } from "../src/slack";
import { delay } from "../src/utils";

import storage from "node-persist";

const messagesForShinkai = [
  {
    jobIndex: 0,
    startingMessage: "What is a potato?",
    continuedMessages: [
      "What are meals that can be prepared using potatoes",
      "How much potatoes one should eat in a day?",
      "When potatoes are unhealthy?",
    ],
  },
  {
    jobIndex: 1,
    startingMessage: "What is a carrot?",
    continuedMessages: [
      "What are meals that can be prepared using carrots",
      "How much carrots one should eat in a day?",
      "When carrots are unhealthy?",
    ],
  },
  {
    jobIndex: 2,
    startingMessage: "What is a tomato?",
    continuedMessages: [
      "What are meals that can be prepared using tomatoes",
      "How much tomatoes one should eat in a day?",
      "When tomatoes are unhealthy?",
    ],
  },
  {
    jobIndex: 3,
    startingMessage: "What is a cucumber?",
    continuedMessages: [
      "What are meals that can be prepared using cucumbers",
      "How much cucumbers one should eat in a day?",
      "When cucumbers are unhealthy?",
    ],
  },
  {
    jobIndex: 4,
    startingMessage: "What is a lettuce?",
    continuedMessages: [
      "What are meals that can be prepared using lettuce",
      "How much lettuce one should eat in a day?",
      "When lettuce is unhealthy?",
    ],
  },
  {
    jobIndex: 5,
    startingMessage: "What is a beetroot?",
    continuedMessages: [
      "What are meals that can be prepared using beetroots",
      "How much beetroots one should eat in a day?",
      "When beetroots are unhealthy?",
    ],
  },
  {
    jobIndex: 6,
    startingMessage: "What is a spinach?",
    continuedMessages: [
      "What are meals that can be prepared using spinach",
      "How much spinach one should eat in a day?",
      "When spinach is unhealthy?",
    ],
  },
  {
    jobIndex: 7,
    startingMessage: "What is a broccoli?",
    continuedMessages: [
      "What are meals that can be prepared using broccoli",
      "How much broccoli one should eat in a day?",
      "When broccoli is unhealthy?",
    ],
  },
  {
    jobIndex: 8,
    startingMessage: "What is a cauliflower?",
    continuedMessages: [
      "What are meals that can be prepared using cauliflower",
      "How much cauliflower one should eat in a day?",
      "When cauliflower is unhealthy?",
    ],
  },
  {
    jobIndex: 9,
    startingMessage: "What is a bell pepper?",
    continuedMessages: [
      "What are meals that can be prepared using bell peppers",
      "How much bell peppers one should eat in a day?",
      "When bell peppers are unhealthy?",
    ],
  },
  {
    jobIndex: 10,
    startingMessage: "What is a zucchini?",
    continuedMessages: [
      "What are meals that can be prepared using zucchinis",
      "How much zucchinis one should eat in a day?",
      "When zucchinis are unhealthy?",
    ],
  },
  {
    jobIndex: 11,
    startingMessage: "What is a pea?",
    continuedMessages: [
      "What are meals that can be prepared using peas",
      "How much peas one should eat in a day?",
      "When peas are unhealthy?",
    ],
  },
  {
    jobIndex: 12,
    startingMessage: "What is a corn?",
    continuedMessages: [
      "What are meals that can be prepared using corn",
      "How much corn one should eat in a day?",
      "When corn is unhealthy?",
    ],
  },
  {
    jobIndex: 13,
    startingMessage: "What is a radish?",
    continuedMessages: [
      "What are meals that can be prepared using radishes",
      "How much radishes one should eat in a day?",
      "When radishes are unhealthy?",
    ],
  },
  {
    jobIndex: 14,
    startingMessage: "What is a pumpkin?",
    continuedMessages: [
      "What are meals that can be prepared using pumpkins",
      "How much pumpkins one should eat in a day?",
      "When pumpkins are unhealthy?",
    ],
  },
  {
    jobIndex: 15,
    startingMessage: "What is a squash?",
    continuedMessages: [
      "What are meals that can be prepared using squash",
      "How much squash one should eat in a day?",
      "When squash is unhealthy?",
    ],
  },
  {
    jobIndex: 16,
    startingMessage: "What is a eggplant?",
    continuedMessages: [
      "What are meals that can be prepared using eggplants",
      "How much eggplants one should eat in a day?",
      "When eggplants are unhealthy?",
    ],
  },
  {
    jobIndex: 17,
    startingMessage: "What is a kale?",
    continuedMessages: [
      "What are meals that can be prepared using kale",
      "How much kale one should eat in a day?",
      "When kale is unhealthy?",
    ],
  },
  {
    jobIndex: 18,
    startingMessage: "What is a mushroom?",
    continuedMessages: [
      "What are meals that can be prepared using mushrooms",
      "How much mushrooms one should eat in a day?",
      "When mushrooms are unhealthy?",
    ],
  },
  {
    jobIndex: 19,
    startingMessage: "What is a onion?",
    continuedMessages: [
      "What are meals that can be prepared using onions",
      "How much onions one should eat in a day?",
      "When onions are unhealthy?",
    ],
  },
  {
    jobIndex: 20,
    startingMessage: "What is a garlic?",
    continuedMessages: [
      "What are meals that can be prepared using garlic",
      "How much garlic one should eat in a day?",
      "When garlic is unhealthy?",
    ],
  },
];

// `Slack` trigger is to call `/slack` endpoint
describe("Integration Tests for WebServer Endpoints", () => {
  let webServer: WebServer;
  let shinkaiManager: ShinkaiManager;
  let slackBot: SlackBot;

  beforeAll(async () => {
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

    await storage.init();

    webServer = new WebServer(shinkaiManager, slackBot, undefined);
    webServer.start(3002);
  });

  it.only("should process event and create a job when receiving an event request", async () => {
    // start monitoring for responses
    shinkaiManager.getNodeResponses();

    // spam the node
    for (const messageInfo of messagesForShinkai) {
      // we only need await for this one
      const jobId = await shinkaiManager.createJobAndSend(
        messageInfo.startingMessage
      );

      if (jobId) {
        for (const continuedMessage of messageInfo.continuedMessages) {
          console.log(
            `Sending continued message: ${continuedMessage} for jobId: ${jobId}`
          );
          // just send it and move on, no need to await
          shinkaiManager
            .createJobAndSend(continuedMessage, jobId)
            .then((_result) => {});
          await delay(1000);
        }
      }
    }

    while (shinkaiManager.activeJobs.length > 0) {
      console.log(shinkaiManager.archiveJobsAnalytics);
      await delay(3000);
    }

    // save benchmarking results to the file
    const fs = require("fs");
    const path = require("path");

    console.log(shinkaiManager.archiveJobsAnalytics);

    const archivePath = path.join(__dirname, "archiveJobsAnalytics.json");
    const archiveData = JSON.stringify(
      shinkaiManager.archiveJobsAnalytics,
      null,
      2
    );

    fs.writeFile(archivePath, archiveData, (err) => {
      if (err) {
        console.error("Error saving archive jobs analytics:", err);
      } else {
        console.log("Archive jobs analytics saved successfully.");
      }
    });

    // time limit can be infinite, depending on paylaoad - it's easy to timeout here
  }, 50_000_000);

  afterAll(() => {});
});
