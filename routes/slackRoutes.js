import { updateMessage } from '../util/slackHelpers.js';
import userDB from '../util/firebaseAPI/users.js';

const slackRoutes = (app) => {

  app.event('message', async ({ message, context, client }) => {
    // console.log('message received: ', message, context);
    // Get user from database so we can check if they have a valid token
    let user = await userDB.getUser(message.user);

    if (user.access_token) {
      updateMessage(message, 'Cool', user.access_token, client);
    } else { // TODO: No access token available, should send a message with a button to approve translations - only if this is a channel with TC set up AND this is the user's first time encountering Translate Channels - no document in database

    }
  })

  // NOTE: Won't be able to authorize app this way, need to do auth via Oauth https://api.slack.com/authentication/oauth-v2
  // Similar to the way it was done in v1 of the app
  // Should be able to put a block in a message to the user when they are posting in a channel and haven't given their permission yet
  app.action('authorize_app', async ({ ack, context, action }) => {
    ack();

    console.log('respond to action ');

  })


  app.event('app_home_opened', async ({ event, client, context }) => {
    try {
      console.log('opening app home ');
      let redirect_url = process.env.REDIRECT_URL || 'https://app.translatechannels.com/auth_redirect';
      let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;
      console.log('auth url ', auth_url);

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
                "text": "*Welcome to Translate Channels* :tada:"
              }
            },
            {
              "type": "divider"
            },
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "Authorize the app to update your messages with translations :point_right: \n _(Each user must do this to enable automatic translation)_"
              },
              accessory: {
                type: "button",
                action_id: "authorize_app",
                text: {
                  type: "plain_text",
                  text: "Authorize App"
                },
                url: auth_url
              }
            },
            {
              "type": "divider"
            }
          ]
        }
      });
    }
    catch (error) {
      console.error(error);
    }
  });

}

export default slackRoutes;