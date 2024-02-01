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
};

export const config: Configuration = {
  encryptionSk: process.env["ENCRYPTION_SK"] || "",
  signatureSk: process.env["SIGNATURE_SK"] || "",
  receiverPk: process.env["RECEIVER_PK"] || "",

  slackAppToken: process.env["SLACK_BOT_TOKEN"],
  profileName: process.env["PROFILE_NAME"] || "main",
  deviceName: process.env["DEVICE_NAME"] || "main_device",
  nodeName: process.env["NODE_NAME"] || "@@localhost.shinkai",
};
