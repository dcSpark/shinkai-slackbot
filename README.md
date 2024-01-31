## Setup

1. Default port is 3001
2. `env.example` defines all required `environmental variables`

## Slack app configuration details

Once this service is deployed Slack Application setup must be upgraded with the url to the endpoint that should be triggered when Slack app command inside cli is executed. Places to `paste` the endpoint details are:

* `Slash Commands -> Request URL`
* `Interactivity & Shortcuts -> Interactivity (must be on) -> Request URL`
