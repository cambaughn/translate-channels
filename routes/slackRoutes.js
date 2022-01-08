import { updateMessage } from '../util/slack/slackHelpers.js';
import buildHomeView from '../views/home.js';
import buildSettingsModal from '../views/settingsModal.js';
import { isAdmin } from '../util/slack/slackUser.js';
import { getInfoForChannels } from '../util/slack/slackHelpers.js';
// Firebase API
import teamsDB from '../util/firebaseAPI/teams.js';
import userDB from '../util/firebaseAPI/users.js';
// Translation
import { getTranslations } from '../util/languages/translatev2.js';
import Translator from '../util/languages/translate.js';


const slackRoutes = (app) => {

  // app.event('message', async ({ message, context, client }) => {
  //   // console.log('message received: ', message, context);
  //   // Get user from database so we can check if they have a valid token
  //   let user = await userDB.getUser(message.user);

  //   if (user.access_token) {
  //     console.log('message ', message);
  //     updateMessage(message, 'Cool', user.access_token, client);
  //   } else { // TODO: No access token available, should send a message with a button to approve translations - only if this is a channel with TC set up AND this is the user's first time encountering Translate Channels - no document in database

  //   }
  // })

  app.event('message', async ({ message, context, client }) => {
    // if the message comes from a bot OR the message has been edited manually, don't translate
    if (message.bot_id || message.subtype === 'message_changed') { 
      return null; 
    } 
    // TODO: re-enable the provide help functionality (along with slash command /nt)
    // if (message.channel_type === 'im') { await provideHelp(context.botToken, message.channel, client); return null; }
    const teamInfo = await teamsDB.getTeam(context.teamId);
    const user = await userDB.getUser(message.user);
    const token = user.access_token;
    if (!token) { return null; }

    // TODO: Implement Stripe connection to check subscription status - will involve more work - currently getting translation working without subscription
    // const allowanceStatus = await dbConnector.planAllowanceExceeded(context.teamId, workspaceData);
    // const allowanceStatusResponse = `${message.text}\n\n\n:earth_africa: _Sorry, you've reached your ${allowanceStatus.reason} limit. Please upgrade your plan._`;
    // if (allowanceStatus.exceeded) { respond(message, allowanceStatusResponse, token); return null; }

    // Determine which languages we need for this channel
    // If the channel has languages set, use those
    const channelLanguages = teamInfo.channel_language_settings[message.channel]?.languages || [];
    // Otherwise, use the workspace languages
    const workspaceLanguages = teamInfo.workspace_languages || [];
    const requiredLanguages = channelLanguages.length > 0 ? channelLanguages : workspaceLanguages;
    // TODO: implement the translator
    const translator = new Translator(message, requiredLanguages);
    const translation = await translator.getTranslatedData();
    console.log('translation -> ', translation);
    if (!translation) { return null; }

    // V2 translator
    // const translation = await getTranslations(message, requiredLanguages);
    // if (!translation) { return null; }

    // if (allowanceStatus.msg) { translation.response += allowanceStatus.msg }
    // dbConnector.saveTranslation(context.teamId, message.ts, message.channel, translation.targetLanguages, translation.inputLanguage, translation.characterCount);
    updateMessage(message, translation.response, token, client);
  });

  // This action only needs to acknowledge the button click - auth is otherwise handled with oAuth redirect url
  app.action('authorize_app', async ({ ack, context, action }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    ack();
  })


  app.action('settings_modal_opened', async ({ ack, action, body, context }) => {
    await ack();
    const homeViewId = body.container.view_id;
    // await dbConnector.saveHomeViewId(context.teamId, homeViewId);
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

    const teamId = context.teamId;
    const userId = body.user.id;
    await teamsDB.updateLanguageSettings(channels, languages, context.teamId);
    let isSlackAdmin = await isAdmin(userId, context.botToken, client);
    let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
    let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
    const result = await client.views.publish(homeView);
  });


  app.event('app_home_opened', async ({ event, client, context }) => {
    try {
      let isSlackAdmin = await isAdmin(event.user, context.botToken, client);
      let redirect_url = process.env.REDIRECT_URL || 'https://app.translatechannels.com/auth_redirect';
      /* view.publish is the method that your app uses to push a view to the Home tab */
      let teamId = event.view?.team_id;
      let userId = event.user;
      let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
      const result = await client.views.publish(homeView);
    }
    catch (error) {
      console.error(error);
    }
  });

}

export default slackRoutes;