import * as dotenv from "dotenv";
dotenv.config();

export type Configuration = {
  encryptionSk: string;
  signatureSk: string;
  receiverPk: string;
  profileName: string;
  deviceName: string;
  nodeName: string;
  slackAppToken: string;
  slackSigningKey: string;
};

export const config: Configuration = {
  encryptionSk: process.env["PROFILE_ENCRYPTION_SK"] || "",
  signatureSk: process.env["PROFILE_IDENTITY_SK"] || "",
  receiverPk: process.env["NODE_ENCRYPTION_PK"] || "",

  slackAppToken: process.env["SLACK_BOT_TOKEN"],
  slackSigningKey: process.env["SLACK_SIGNING_SECRET"],

  profileName: process.env["PROFILE_NAME"] || "main",
  deviceName: process.env["DEVICE_NAME"] || "main_device",
  nodeName: process.env["NODE_NAME"] || "@@localhost.shinkai",
};
