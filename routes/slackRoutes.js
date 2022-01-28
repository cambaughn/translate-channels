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
// Subscription
import { getSubscriptionData, reportSubscriptionUsage } from '../util/stripe/stripe.js';
// Analytics
import Mixpanel from 'mixpanel';
// create an instance of the mixpanel client
const mixpanel = Mixpanel.init(process.env.MIXPANEL_API_KEY);


const slackRoutes = (app) => {

  app.event('message', async ({ message, context, client }) => {
    console.log('message event');
    // if the message comes from a bot OR the message has been edited manually, don't translate
    if (message.bot_id || message.subtype === 'message_changed') { 
      return null; 
    } 

    // If the message is in an IM to the app bot, just return the help message
    if (message.channel_type === 'im') { 
      await provideHelp(context.botToken, message.user, client); 
      return null; 
    }
    
    const team = await teamsDB.getTeam(context.teamId);
    const user = await userDB.getUser(message.user);
    const token = user?.access_token;
    if (!token) {  // if there is no access token for the user
      return null; 
    }

    // Check for active subscription in Stripe
    const isProd = process.env.ENVIRONMENT !== 'development';
    const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
    const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
    const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';
    // If subscription is not active, do nothing
    if (!subscriptionActive) {
      return null; 
    }

    // Log metered usage for per-seat subscription
    if (subscriptionData?.status === 'active') {
      let subscriptionReport = await reportSubscriptionUsage(subscriptionData, user);
    }

    // Determine which languages we need for this channel
    // If the channel has languages set, use those
    const channelLanguages = team.channel_language_settings[message.channel]?.languages || [];
    // Otherwise, use the workspace languages
    const workspaceLanguages = team.workspace_languages || [];
    const requiredLanguages = channelLanguages.length > 0 ? channelLanguages : workspaceLanguages;
    const translator = new Translator(message, requiredLanguages);
    const translation = await translator.getTranslatedData();
    if (!translation) { // if the translation didn't return anything
      return null; 
    }

    mixpanel.track('Translate Message', {
      "User ID": message.user
    });

    updateMessage(message, translation.response, token, client);
  });


  app.command('/nt', async ({ ack, command, context, client }) => {
    console.log('/nt slash command');
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
    console.log('authorize_app event');
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })  
  
  // This action only needs to acknowledge the button click - auth is otherwise handled with a url
  app.action('manage_plan', async ({ ack }) => {
    console.log('manage_plan event');
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })


  app.action('settings_modal_opened', async ({ ack, action, body, context }) => {
    console.log('settings_modal_opened event');
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
    console.log('settings_modal_submitted event');
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
    console.log('app_home_opened event');
    try {
      let isSlackAdmin = await isAdmin(event.user, context.botToken, client);
      let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
      /* view.publish is the method that your app uses to push a view to the Home tab */
      let teamId = context.teamId;
      let userId = event.user;
      let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
      homeView.token = context.botToken;
      console.log('view config ', homeView.token, homeView.user_id);
      const result = await client.views.publish(homeView);
    } catch (error) {
      console.error(error);
    }
  });

  app.event('app_uninstalled', async ({ event, ack }) => {
    console.log('app_uninstalled event');
    if (ack) {
      await ack();
    }
    await teamsDB.deactivateTeam(event.team_id)
  });
}

export default slackRoutes;