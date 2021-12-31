import { updateMessage } from '../util/slack/slackHelpers.js';
import userDB from '../util/firebaseAPI/users.js';
import buildHomeView from '../views/home.js';
import buildSettingsModal from '../views/settingsModal.js';
import { isAdmin } from '../util/slack/slackUser.js';
import { getInfoForChannels } from '../util/slack/slackHelpers.js';
import teamsDB from '../util/firebaseAPI/teams.js';


const slackRoutes = (app) => {

  app.event('message', async ({ message, context, client }) => {
    // console.log('message received: ', message, context);
    // Get user from database so we can check if they have a valid token
    let user = await userDB.getUser(message.user);

    if (user.access_token) {
      console.log('message ', message);
      updateMessage(message, 'Cool', user.access_token, client);
    } else { // TODO: No access token available, should send a message with a button to approve translations - only if this is a channel with TC set up AND this is the user's first time encountering Translate Channels - no document in database

    }
  })

  // NOTE: Won't be able to authorize app this way, need to do auth via Oauth https://api.slack.com/authentication/oauth-v2
  // Similar to the way it was done in v1 of the app
  // Should be able to put a block in a message to the user when they are posting in a channel and haven't given their permission yet
  app.action('authorize_app', async ({ ack, context, action }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    ack();
  })


  app.action('settings_modal_opened', async ({ ack, action, body, context }) => {
    await ack();
    const homeViewId = body.container.view_id;
    // await dbConnector.saveHomeViewId(context.teamId, homeViewId);
    console.log('action ', action.value);
    const settingsModal = await buildSettingsModal(action.value);
    try {
      // Opens the modal itself
      await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: settingsModal
      });
    } catch (error) {
      console.error(error);
    }
  });


  app.view('settings_modal_submitted', async ({ ack, view, context, body, client }) => {
    await ack();
    const settingsModal = view.state.values;
    const languages = settingsModal.select_lang_block.select_lang.selected_options.map(x => x.value);
    const channelIds = settingsModal.select_channel_block.select_channel.selected_channels;
    const channels = await getInfoForChannels(channelIds, client, context);

    await teamsDB.updateLanguageSettings(channels, languages, context.teamId);
    // const user = body.user.id;
    // const homeView = await buildHomeView(context, user, client);
    // const homeViewId = await dbConnector.getHomeViewId(context.teamId);
    // try {
    //   await slackApp.client.views.update({
    //     token: context.botToken,
    //     view: homeView,
    //     view_id: homeViewId
    //   });
    // } catch (error) {
    //   console.error(error);
    // }
  });


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