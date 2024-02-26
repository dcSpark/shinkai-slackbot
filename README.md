# Shinkai Slack Integration

## Deployments

1. Setup `.env` variables (make sure the node is running)
2. To build and run:

```bash
# checkout correct node version 
nvm use

# build - resulting build is going to be saved inside `build/` directory 
npm run build

# run the service
npm run start
```

3. Once all is setup, you can test the service by executing a curl command to the `/health` endpoint:

```json
{
   "status": "success",
   "message": "Shinkai Slack backend is up and running."
}
```

## Slack app configuration details

This part of README.md is WIP, because implementation will change. However, it's important to note, that once this service is deployed, the url for the `trigger` endpoint needs to be configured in Slack settings.

Once this service is deployed Slack Application setup must be upgraded with the url to the endpoint that should be triggered when Slack app command inside cli is executed. Places to `paste` the endpoint details are:

* `Slash Commands -> Request URL`
* `Interactivity & Shortcuts -> Interactivity (must be on) -> Request URL`

In order to be able to have full Slack integration, we need to get details about Slack Application token and setup necessary configurations. Bot requires 2 pieces of information:

1. **Slack bot token (xoxb-)**: To retrieve your Slack bot token, first navigate to the Slack API website and log in to your account. Then, create a new app or select an existing one from your apps list. Under the 'Features' section in the sidebar, click on 'OAuth & Permissions'. Scroll down to the 'Bot Token Scopes' section and add the necessary scopes for your bot. After configuring the scopes, scroll up to the 'OAuth Tokens for Your Workspace' section and click the 'Install to Workspace' button. Follow the prompts to install the app to your workspace, and you will be provided with a bot token starting with `xoxb-``. This token is what you'll use to authenticate your bot with the Slack API.
2. **Slack channel id**, where the bot is going to be installed

## Development

```bash
nvm use

npm i

# nodemon is used here under the hood
npm run dev

# testing
npm run test

# to run benchmarking - this has to be triggered manually and it's not included in default tests
npm run test:benchmark
```

## Environment Variables Explanation

The `.env.example` file provides a template for setting up your environment variables. Here's a breakdown of what each variable means:

* `PROFILE_ENCRYPTION_SK`: Secret key for profile encryption.
* `PROFILE_IDENTITY_SK`: Secret key for profile identity.
* `NODE_ENCRYPTION_PK`: Public key for node encryption.

* `PROFILE_NAME`: The name of your profile.
* `DEVICE_NAME`: The name of your device.
* `NODE_NAME`: The name of your node, typically set to `@@localhost.shinkai` for local development.

* `SHINKAI_NODE_URL`: The URL of the Shinkai node. This is typically set to `http://127.0.0.1:9550` for local development.

* `SLACK_BOT_TOKEN`: The token for your Slack bot. This is required for the bot to function.
* `SLACK_CHANNEL_ID`: The ID of the Slack channel where the bot will operate.
* `SLACK_SIGNING_SECRET`: The signing secret for your Slack app. This is used to verify that incoming requests from Slack are legitimate. It's available from your Slack app's "Basic Information" page under "App Credentials". **This is optional parameter in case `/slack` endpoint is going to be used. Otherwise, feel free to skip it**

* `PORT`: The port on which your service will run. The default is `3001`.

Make sure to copy `.env.example` to `.env` and fill in the values before running your application.
