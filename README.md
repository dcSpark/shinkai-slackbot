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
