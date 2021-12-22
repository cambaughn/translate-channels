import { updateMessage } from '../util/slackHelpers.js';
import userDB from '../util/firebaseAPI/users.js';
import buildHomeView from '../util/slack/home.js';
import { isAdmin } from '../util/slack/slackUser.js';

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
      let isSlackAdmin = await isAdmin(event.user, context.botToken, client);
      console.log('is slack admin ', isSlackAdmin);
      /* view.publish is the method that your app uses to push a view to the Home tab */
      let homeView = await buildHomeView(event, redirect_url, isSlackAdmin);
      const result = await client.views.publish(homeView);
    }
    catch (error) {
      console.error(error);
    }
  });

}

export default slackRoutes;