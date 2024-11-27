Translate Channels
=================

Translate Channels utilizes [Bolt](https://slack.dev/bolt), Slack's framework that helps you build JavaScript-based Slack apps in a flash.
Read our [Getting Started with Bolt](https://api.slack.com/start/building/bolt) guide for an in-depth tutorial.
Read the [Getting Started guide](https://api.slack.com/start/building/bolt) for an easy start.
Read the [Bolt documentation](https://slack.dev/bolt) for all documentation.

File locations:
- `app.js` contains the primary Bolt app. It imports the Bolt package (`@slack/bolt`) and starts the Bolt app's server. It's where you'll add your app's listeners.
- `.env` is where you'll put your Slack app's authorization token and signing secret.

-------------------

# First-time set up
From the terminal, run:
- `yarn` to install all packages
- `brew install ngrok/ngrok/ngrok` to install ngrok (creates a secure tunnel for the local development server)
- `ngrok config add-authtoken 2oMsFdLSJ6fq6HtQkR8gICmV466_3vDW9GQWt3WCCEfEGDUun` to set up ngrok. This auth token may expire or change. You can get a new one at [ngrok.com](https://ngrok.com/), where **team@translatechannels.com** has an account.

# Set up
From the terminal, run:
- `yarn`
- `brew install ngrok/ngrok/ngrok`
- `ngrok config add-authtoken 2oMsFdLSJ6fq6HtQkR8gICmV466_3vDW9GQWt3WCCEfEGDUun`

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
-------------------

# Submitting the app for review by Slack
- Download staging app: https://translate-channels-staging-f5bab0837b06.herokuapp.com/direct_install
- Using an admin account, sign up for any of the plans
- Stripe is on test mode, so you can use a Stripe test credit card: https://stripe.com/docs/testing
- Happy testing!

\ ゜o゜)ノ
