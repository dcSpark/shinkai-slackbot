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
  encryptionSk: process.env["encryption_sk"] || "",
  signatureSk: process.env["signature_sk"] || "",
  receiverPk: process.env["receiver_pk"] || "",
  slackAppToken: process.env["SLACK_BOT_TOKEN"],
  profileName: "main",
  deviceName: "main_device",
  nodeName: "@@localhost.shinkai",
};
