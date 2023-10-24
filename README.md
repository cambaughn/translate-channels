Bolt app template
=================

[Bolt](https://slack.dev/bolt) is our framework that lets you build JavaScript-based Slack apps in a flash.

This project is a simple app template to make it easy to create your first Bolt app. Read our [Getting Started with Bolt](https://api.slack.com/start/building/bolt) guide for a more in-depth tutorial

Your Project
------------

- `app.js` contains the primary Bolt app. It imports the Bolt package (`@slack/bolt`) and starts the Bolt app's server. It's where you'll add your app's listeners.
- `.env` is where you'll put your Slack app's authorization token and signing secret.
- The `examples/` folder contains a couple of other sample apps that you can peruse to your liking. They show off a few platform features that your app may want to use.


Read the [Getting Started guide](https://api.slack.com/start/building/bolt)
-------------------

Read the [Bolt documentation](https://slack.dev/bolt)
-------------------

# Running the app
In two separate terminal tabs, run:
- `ngrok http 3000`
- `npm run dev`

Then, add the https url from ngrok to these pages on your test Slack app configuration:
- Event Subscriptions (add /slack/events to the url)
- Slash Commands (add /slack/events to the url)
- Interactivity and Shortcuts (add /slack/events to the url)
- OAuth and Permissions > Redirect URLs (just need base URL) - this is for installing via /direct_install

Configure the REDIRECT_URL and BASE_URL values in the .env file to match your ngrok url (note that REDIRECT_URL has /auth_redirect at the end—keep this)

Reinstall the app via the /direct_install url

\ ゜o゜)ノ
