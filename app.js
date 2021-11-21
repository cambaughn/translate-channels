// Require the Bolt package (github.com/slackapi/bolt)
import { App } from "@slack/bolt";
import dotenv from 'dotenv';
dotenv.config();
import { updateMessage } from './util/slackHelpers.js';

console.log('process: ', process.env.SLACK_BOT_TOKEN, process.env.SLACK_SIGNING_SECRET);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});


app.event('message', async ({ message, context, client }) => {
  console.log('message received: ', message, context, client);
  let token = context.botToken;
  updateMessage(message, 'Cool', token, client);
})

// NOTE: Won't be able to authorize app this way, need to do auth via Oauth https://api.slack.com/authentication/oauth-v2
// Similar to the way it was done in v1 of the app
// Should be able to put a block in a message to the user when they are posting in a channel and haven't given their permission yet
app.action('authorize_app', async ({ ack, context, action }) => {
  ack();

  console.log('respond to action ', action);

})


app.event('app_home_opened', async ({ event, client, context }) => {
  try {
    console.log('opening app home ');
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.publish({

      /* the user that opened your app's app home */
      user_id: event.user,

      /* the view object that appears in the app home*/
      view: {
        type: 'home',
        callback_id: 'home_view',

        /* body of the view */
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Welcome to your _App's Home_* :tada:"
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Testing! `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app."
            },
            accessory: {
              type: "button",
              action_id: "authorize_app",
              text: {
                type: "plain_text",
                text: "Authorize App"
              }
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                // TODO: Add an action_id here as per: https://api.slack.com/tutorials/app-home-with-modal
                // Should be able to listen for that action id in app.js
                // Then, can get the user Authorization there, store it in Firebase
                "text": {
                  "type": "plain_text",
                  "text": "Click me!"
                }
              }
            ]
          }
        ]
      }
    });
  }
  catch (error) {
    console.error(error);
  }
});




(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
