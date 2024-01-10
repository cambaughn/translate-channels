// Views
import buildHomeView from '../views/home.js';
import buildSettingsModal from '../views/settingsModal.js';
// Slack Helpers
import { isAdmin, getUserInfo } from '../util/slack/slackUser.js';
import { updateMessage, getInfoForChannels, provideHelp, postMessageAsUser, sendUpgradeMessage, sendAuthDM } from '../util/slack/slackHelpers.js';
// Firebase API
import teamsDB from '../util/firebaseAPI/teams.js';
import userDB from '../util/firebaseAPI/users.js';
// Translation
import Translator from '../util/languages/translate.js';
// Subscription
import { getSubscriptionData, reportSubscriptionUsage, getSubscriptionTierDetails, cancelSubscription } from '../util/stripe/stripe.js';


/**
   * Publishes the home view for a user.
   * This function builds and publishes the home view for a given user by checking if the 
   * user is an admin and building the home view accordingly. The view is then published 
   * using the provided Slack client.
   *
   * @param {string} userId - The ID of the user for whom the home view will be published.
   * @param {string} teamId - The ID of the team that the user belongs to.
   * @param {Object} context - The context of the event.
   * @param {string} context.botToken - The bot token of the app.
   * @param {Object} client - Slack client instance to make API calls.
   *
   * @returns {Promise<void>} A promise indicating the completion of the home view publishing.
*/
const publishHomeView = async (userId, teamId, context, client) => {
  let isSlackAdmin = await isAdmin(userId, context.botToken, client);
  let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
  let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
  await client.views.publish(homeView);
}


const slackRoutes = (app) => {

  /**
     * Slack Event Handler for 'message' event.
     * This handler checks if the message comes from a bot or if it's an edited message, 
     * in which case it does nothing. If the message is in an IM to the app bot, it sends 
     * a help message. Otherwise, it checks if the user has an active subscription, if the
     * subscription is metered, it reports usage. If the subscription is licensed, it checks
     * that the number of users is within the current plan limits and sends an upgrade message
     * if necessary.
     *
     * @param {Object} message - The message object containing the message information.
     * @param {string} message.user - The ID of the user who sent the message.
     * @param {string} message.channel_type - The type of channel where the message was sent.
     * @param {string} message.bot_id - The ID of the bot if the message was sent by a bot.
     * @param {string} message.subtype - The subtype of the message, 'message_changed' if it was edited.
     * @param {Object} context - The context of the event.
     * @param {string} context.teamId - The ID of the team that the event belongs to.
     * @param {string} context.botToken - The bot token of the app.
     * @param {Object} client - Slack client instance to make API calls.
     *
     * @returns {Promise<void>} A promise indicating the completion of the message handling.
   */
  app.event('message', async ({ message, context, client }) => {
    console.log('bot token! ', context.botToken)
    // if the message comes from a bot OR the message has been edited manually, don't translate
    if (message.bot_id || message.subtype === 'message_changed' || !message.user) {
      return null; 
    } 

    if (message.subtype === 'me_message') { 
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
    const sentAuthMessage = user?.sent_auth_message;

    if (!token) {  // if there is no access token for the user, return null
      if (!sentAuthMessage) {
        // If the user is not authenticated, send the DM auth message
        sendAuthDM(context.botToken, client, message.user);
        await userDB.updateUser(message.user, { sent_auth_message: true });
      }
      return null;
    }

    // Check for active subscription in Stripe
    const isProd = process.env.ENVIRONMENT !== 'development';
    const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
    const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
    const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';
    const usageType = subscriptionData?.plan?.usage_type;

    // If subscription is not active, do nothing
    if (!subscriptionActive) {
      return null; 
    }

    // Log metered usage for per-seat subscription
    if (usageType === 'metered' && (subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing')) {
      console.log('===reporting usage===');
      let subscriptionReport = await reportSubscriptionUsage(subscriptionData, user);
    }

    // If the team is on the tiered plan, need to determine that they are on the correct tier for the number of users
    if (usageType === 'licensed') {
      // Get tier details
      const tierDetails = getSubscriptionTierDetails(subscriptionData.plan.id);

      if (!tierDetails.unlimited) { // Don't need to run this code for unlimited plans
        // Determine number of registered users
        const numRegisteredUsers = await userDB.getRegisteredUsersForTeam(context.teamId);
        // const numRegisteredUsers = 10;
        // Verify that number of users is within the current plan limits
        if (numRegisteredUsers > tierDetails.maxUsers) { // If there are more registered users than allowed on the current plan (don't run this code for unlimited plans)
        await sendUpgradeMessage(context.botToken, message.user, client, tierDetails, numRegisteredUsers); 
        return null;
        }
      }
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
    updateMessage(message, translation.response, token, client);
  });
  
  /**
     * Slack Command Handler for '/nt' command.
     * This handler acknowledges the command, checks the command text, and responds accordingly.
     * If the command text is 'help' or empty, it will send a help message.
     * Otherwise, it posts the user's message to the channel.
     *
     * @param {Object} context - The context of the command.
     * @param {Object} command - The command object containing the command information.
     * @param {string} command.text - The text of the command.
     * @param {string} command.user_id - The ID of the user who issued the command.
     * @param {string} command.channel_id - The ID of the channel where the command was issued.
     * @param {function} ack - Function to acknowledge the command.
     * @param {Object} client - Slack client instance to make API calls.
     *
     * @returns {Promise<void>} A promise indicating the completion of command handling.
   */
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

  /**
     * Opens the settings modal in the Slack application.
     *
     * @param {Object} actionValue - The action value received from the 'settings_modal_opened' action.
     * @param {Object} body        - The body of the action event.
     * @param {string} body.trigger_id - The trigger ID provided by Slack to open a modal.
     * @param {Object} context     - The context in which the event occurred.
     * @param {string} context.botToken - The bot token used to authenticate with the Slack API.
     * @returns {Promise<Object>} A promise that resolves with the response from the Slack API when the modal is opened.
   */
  const openSettingsModal = async (actionValue, body, context) => {
    const settingsModal = await buildSettingsModal(actionValue);
      // Opens the modal itself
    return app.client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: settingsModal
    });
  }

  /**
     * Handles the 'settings_modal_opened' action. This opens the settings modal when the corresponding button is clicked.
     *
     * @param {Object}   payload             - The payload of the Slack action.
     * @param {Function} payload.ack         - Function to acknowledge the action from Slack.
     * @param {Object}   payload.action      - The action object from Slack.
     * @param {string}   payload.action.value - The value associated with the action.
     * @param {Object}   payload.body        - The body of the action event.
     * @param {string}   payload.body.trigger_id - The trigger ID provided by Slack to open a modal.
     * @param {Object}   payload.context     - The context in which the event occurred.
     * @param {string}   payload.context.botToken - The bot token used to authenticate with the Slack API.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  app.action('settings_modal_opened', async ({ ack, action, body, context }) => {
    console.log('settings_modal_opened event');
    await ack();

    let actionValue = JSON.parse(action.value);
    const settingsModal = await buildSettingsModal(actionValue);
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

  /**
     * Handles the 'overflow_selected' action. This can either open the settings modal or remove channel settings, based on the action value.
     *
     * @param {Object}   payload             - The payload of the Slack action.
     * @param {Function} payload.ack         - Function to acknowledge the action from Slack.
     * @param {Object}   payload.action      - The action object from Slack.
     * @param {Object}   payload.action.selected_option - The selected option in the overflow menu.
     * @param {Object}   payload.body        - The body of the action event.
     * @param {string}   payload.body.user.id - The ID of the user who triggered the action.
     * @param {Object}   payload.context     - The context in which the event occurred.
     * @param {string}   payload.context.teamId - The ID of the team to which the user belongs.
     * @param {Object}   payload.client      - The Slack WebClient instance to interact with Slack API.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  app.action('overflow_selected', async ({ ack, action, body, context, client }) => {
    console.log('overflow_selected event ');
    await ack();

    let actionValue = JSON.parse(action.selected_option.value);
    const teamId = context.teamId;
    const userId = body.user.id;

    try {
      if (actionValue.type === 'edit_settings') { // open the settings modal
        await openSettingsModal(actionValue, body, context);
      } else { // delete channel from settings
        await teamsDB.removeChannelSettings(actionValue.id, context.teamId);
        // publishHomeView(userId, teamId, context, client);

        let isSlackAdmin = await isAdmin(userId, context.botToken, client);
        let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
        /* view.publish is the method that your app uses to push a view to the Home tab */
        let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin, client);
        homeView.token = context.botToken;
        console.log('view config ', homeView.token, homeView.user_id);
        await client.views.publish(homeView);
      }
    } catch (error) {
      console.error(error);
    }
  });

  /**
     * Handles the 'settings_modal_submitted' view submission by updating language settings and publishing a new home view.
     *
     * @param {Object}   payload             - The payload of the Slack view submission.
     * @param {Function} payload.ack         - Function to acknowledge the view submission from Slack.
     * @param {Object}   payload.view        - The state of the view at the time of submission.
     * @param {Object}   payload.view.state.values - The values of the inputs in the view.
     * @param {Object}   payload.context     - The context in which the event occurred.
     * @param {string}   payload.context.teamId - The ID of the team to which the user belongs.
     * @param {Object}   payload.body        - The body of the view submission event.
     * @param {string}   payload.body.user.id - The ID of the user who submitted the view.
     * @param {Object}   payload.client      - The Slack WebClient instance to interact with Slack API.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
  */
  app.view('settings_modal_submitted', async ({ ack, view, context, body, client }) => {
    console.log('settings_modal_submitted event');

    const userId = body.user.id;
    const teamId = context.teamId;
    const settingsModal = view.state.values;
    const languages = settingsModal.select_lang_block.select_lang.selected_options.map(x => x.value);
    console.log('select_channel_block :::::: ', !!settingsModal.select_channel_block)

    if (settingsModal.select_channel_block) { // User is setting channel-specific languages
      const channelIds = settingsModal.select_channel_block.select_channel.selected_conversations;
      console.log('channelIds ', channelIds)
      let channels = await getInfoForChannels(channelIds, client, context.botToken);
      let errorChannelIds = [];
  
      channels.forEach((channel, index) => {
        if (!channel.id && channel.id !== 'any_channel') {
          errorChannelIds.push(channelIds[index]);
        }
      })
  
      if (errorChannelIds.length > 0) { // error if the bot is not a member of the selected channels
        let userData = await userDB.getUser(userId);
        let errorChannels = await getInfoForChannels(errorChannelIds, client, userData.access_token);
        let errorChannelNames = errorChannels.map(channel => channel.name);
        let errorMessage = errorChannelNames.length > 0 ? 
          `Translate Channels is not yet a member of the following private channels: ${errorChannelNames.join(', ')}. Please invite Translate Channels to these channels and try again.` : 
          `Translate Channels is not yet a member of these private channels. Please invite Translate Channels to the private channels and try again.`;
  
        const errorView = {
          "response_action": "errors",
          "errors": {
            "select_channel_block": errorMessage
          }
        }
        await ack(errorView);
        return null;
      } else {
        await ack();
        const channelsForDB = channels.map(channel => ({ id: channel.id, name: channel.name, is_private: channel.is_private }));
        console.log('channels! ', channels)
        await teamsDB.updateLanguageSettings(channelsForDB, languages, teamId);
      }
    } else { // User is setting workspace languages
      await ack();
      await teamsDB.updateLanguageSettings([], languages, teamId);
    }
    

    
    // publishHomeView(userId, teamId, context, client);
    let isSlackAdmin = await isAdmin(userId, context.botToken, client);
    let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
    /* view.publish is the method that your app uses to push a view to the Home tab */
    let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin, client);
    homeView.token = context.botToken;
    console.log('view config ', homeView.token, homeView.user_id);
    await client.views.publish(homeView);
  });

  /**
     * Handles the 'app_home_opened' event by building and publishing the Home tab view for the user.
     *
     * @param {Object}   payload                   - The payload of the Slack event.
     * @param {Object}   payload.event             - The event data sent by Slack.
     * @param {string}   payload.event.user        - The ID of the user who opened the app home.
     * @param {Object}   payload.context           - The context in which the event occurred.
     * @param {string}   payload.context.teamId    - The ID of the team to which the user belongs.
     * @param {string}   payload.context.botToken  - The bot token associated with your app.
     * @param {Object}   payload.client            - The Slack WebClient instance to interact with Slack API.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  app.event('app_home_opened', async ({ event, client, context }) => {
    console.log('app_home_opened event');
    try {
      let isSlackAdmin = await isAdmin(event.user, context.botToken, client);
      let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
      /* view.publish is the method that your app uses to push a view to the Home tab */
      let teamId = context.teamId;
      let userId = event.user;
      let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin, client);
      homeView.token = context.botToken;
      console.log('view config ', homeView.token, homeView.user_id);
      await client.views.publish(homeView);
    } catch (error) {
      console.error(error);
    }
  });

  // User leaves workspace - use to de-authorize user so they don't count toward team total
  app.event("user_change", async ({ event, client }) => {
    // Check if the user is no longer in the workspace
    if (event.user.deleted) {
      console.log(`User ${event.user.name} has left the workspace`);
      // Do something here, such as send a notification to a channel or update a database
      
    }
  });
  
  /**
     * Responds to the 'app_uninstalled' event by cancelling the team's Stripe subscription.
     *
     * @param {Object}   payload                   - The payload of the Slack event.
     * @param {Object}   payload.event             - The event data sent by Slack.
     * @param {Object}   payload.context           - The context in which the event occurred.
     * @param {string}   payload.context.teamId    - The ID of the team that uninstalled the app.
     * @param {Function} payload.ack               - The function to acknowledge the event received from Slack.
     * @returns {Promise<void>}                    - A promise that resolves when the operation is complete.
  */
  // app.event('app_uninstalled', async ({ event, context, ack }) => {
  //   console.log('====> app_uninstalled event ', event, context);
  //   if (ack) {
  //     await ack();
  //   }

  //   // Delete subscription from Stripe
  //   const team = await teamsDB.getTeam(context.teamId);
  //   const isProd = process.env.ENVIRONMENT !== 'development';
  //   const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
  //   const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
  //   const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';

  //   if (subscriptionActive) {
  //     console.log('cancelling subscription ', subscriptionData.id);
  //     let result = await cancelSubscription(subscriptionData.id);
  //     console.log('cancelled subscription ', result)
  //   }

  //   // Deactivate team in Firebase
  //   await teamsDB.deactivateTeam(context.teamId);
  // });

  // app.event('tokens_revoked', async ({ event, ack }) => {
  //   console.log('tokens_revoked event');
  //   if (ack) {
  //     await ack();
  //   }

  //   // Delete subscription from Stripe
  //   const team = await teamsDB.getTeam(event.team_id);
  //   const isProd = process.env.ENVIRONMENT !== 'development';
  //   const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
  //   const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
  //   const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';

  //   if (subscriptionActive) {
  //     console.log('cancelling subscription ', subscriptionData.id);
  //     let result = await cancelSubscription(subscriptionData.id);
  //     console.log('cancelled subscription ', result)
  //   }

  //   // Deactivate team in Firebase
  //   await teamsDB.deactivateTeam(event.team_id);
  // });

  // All the next routes only need to acknowledge the event, the actual functionality is done as a link to a url in ../views/home.js
  // This action only needs to acknowledge the button click - auth is otherwise handled with oAuth redirect url
  app.action('authorize_app', async ({ ack }) => {
    console.log('authorize_app event');
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })

  app.action('action_auth', async ({ ack }) => {
    console.log('action_auth event');
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })  
  
  // This action only needs to acknowledge the button click - auth is otherwise handled with a url
  app.action('manage_plan', async ({ ack }) => {
    console.log('manage_plan event');
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })
  
  app.action('small_plan_click', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })

  app.action('medium_plan_click', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })

  app.action('large_plan_click', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })

  
  app.action('unlimited_plan_click', async ({ ack }) => {
    // We just need ack() here to respond to the action, even though we're redirecting to a url
    await ack();
  })
}

export default slackRoutes;