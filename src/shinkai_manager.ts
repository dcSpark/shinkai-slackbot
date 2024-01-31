import {
  InboxName,
  JobScope,
  MessageSchemaType,
  ShinkaiMessage,
  ShinkaiMessageBuilder,
  TSEncryptionMethod,
} from "@shinkai_protocol/shinkai-typescript-lib";
import { postData } from "./utils";

export class ShinkaiManager {
  private encryptionSecretKey: Uint8Array;
  private signatureSecretKey: Uint8Array;
  private receiverPublicKey: Uint8Array;
  private shinkaiName: string;
  private profileName: string;
  private deviceName: string;

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

  async buildGetInboxes(): Promise<any> {
    // Option A
    // const messageBuilder = new ShinkaiMessageBuilder(
    //   this.encryptionSecretKey,
    //   this.signatureSecretKey,
    //   this.receiverPublicKey
    // );

    // await messageBuilder.init();

    // const message = await messageBuilder
    //   .set_message_raw_content(this.shinkaiName + "/" + this.profileName)
    //   .set_body_encryption(TSEncryptionMethod.DiffieHellmanChaChaPoly1305)
    //   .set_message_schema_type(MessageSchemaType.TextContent)
    //   .set_internal_metadata_with_inbox(
    //     this.profileName,
    //     "",
    //     "",
    //     TSEncryptionMethod.None
    //   )
    //   .set_external_metadata_with_intra_sender(
    //     this.shinkaiName,
    //     this.shinkaiName,
    //     this.profileName
    //   )
    //   .build();

    // return message;
    // Option B
    return await ShinkaiMessageBuilder.getAllInboxesForProfile(
      this.encryptionSecretKey,
      this.signatureSecretKey,
      this.receiverPublicKey,
      this.shinkaiName + "/" + this.profileName,
      this.shinkaiName,
      this.profileName,
      this.shinkaiName
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

  public async getMessages(jobId: string) {
    const inbox = InboxName.getJobInboxNameFromParams(jobId).value;
    const message = await this.buildGetMessagesForInbox(inbox);
    let resp = await postData(message, "/v1/last_messages_from_inbox");
    console.log(JSON.stringify(resp, null, 2));
  }

  public async createJob(agent: string) {
    const jobMessage = await this.buildCreateJob(agent);
    console.log("### Message:");
    console.log(jobMessage);

    let resp = await postData(JSON.stringify(jobMessage), "/v1/create_job");

    if (resp.status === "success") {
      return resp.data;
    } else {
      throw new Error(`Job creation failed: ${resp}`);
    }
  }

  public async getInboxes() {
    const message = await this.buildGetInboxes();
    let resp = await postData(message, "/v1/get_all_smart_inboxes_for_profile");
    console.log(resp);
  }
}
