// Views
import buildHomeView from '../views/home.js';
import buildSettingsModal from '../views/settingsModal.js';
// Slack Helpers
import { isAdmin } from '../util/slack/slackUser.js';
import { updateMessage, getInfoForChannels, provideHelp, postMessageAsUser } from '../util/slack/slackHelpers.js';
// Firebase API
import teamsDB from '../util/firebaseAPI/teams.js';
import userDB from '../util/firebaseAPI/users.js';
// Translation
import { getTranslations } from '../util/languages/translatev2.js';
import Translator from '../util/languages/translate.js';


const slackRoutes = (app) => {

  app.event('message', async ({ message, context, client }) => {
    // if the message comes from a bot OR the message has been edited manually, don't translate
    if (message.bot_id || message.subtype === 'message_changed') { 
      return null; 
    } 
    // TODO: re-enable the provide help functionality (along with slash command /nt)
    if (message.channel_type === 'im') { 
      console.log(message);
      // provideHelp(context.botToken, message.user, client); 
      return null; 
    }
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
    const translator = new Translator(message, requiredLanguages);
    const translation = await translator.getTranslatedData();
    if (!translation) { return null; }

    // if (allowanceStatus.msg) { translation.response += allowanceStatus.msg }
    // dbConnector.saveTranslation(context.teamId, message.ts, message.channel, translation.targetLanguages, translation.inputLanguage, translation.characterCount);
    updateMessage(message, translation.response, token, client);
  });


  app.command('/nt', async ({ ack, command, context, client }) => {
    await ack();
    if (command.text === 'help' || !command.text) {
      // provideHelp sends a private message to the user with FAQs
      provideHelp(context.botToken, command.user_id, client); 
      return null; 
    }

    // If the user is not requesting help, just post their message directly as it is
    const user = await userDB.getUser(command.user_id);
    if (command.text) { // not an empty message
      await postMessageAsUser(command.text, command.channel_id, user.access_token, client);
    }
  });

  // This action only needs to acknowledge the button click - auth is otherwise handled with oAuth redirect url
  app.action('authorize_app', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    ack();
  })  
  
  // This action only needs to acknowledge the button click - auth is otherwise handled with a url
  app.action('manage_plan', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    ack();
  })


  app.action('settings_modal_opened', async ({ ack, action, body, context }) => {
    await ack();
    const homeViewId = body.container.view_id;
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