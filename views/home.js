import teamsDB from "../util/firebaseAPI/teams.js";
import userDB from "../util/firebaseAPI/users.js";
import { getSettingsString } from '../util/languages/languageHelpers.js';
import { getSubscriptionData } from "../util/stripe/stripe.js";

const buildHomeView = async (userId, teamId, redirect_url, userIsAdmin, nonAdminAllowSettings) => {
  let auth_url = `https://slack.com/oauth/v2/authorize?scope=channels:read,chat:write,commands,im:history,users:read&user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

  let user = await userDB.getUser(userId);
  let team = {};

  if (teamId) {
    console.log('getting team in homeview ', teamId);
    team = await teamsDB.getTeam(teamId);
    // Record team viewing the homescreen for the first time
    if (!team?.viewed_app_home) {
      teamsDB.updateTeam(teamId, { viewed_app_home: true })
    }
  }
  // console.log('got team in homeview', team);


  // Subscription details
  const isProd = process.env.ENVIRONMENT !== 'development';
  const portalUrl = `${process.env.BASE_URL}/portal?teamId=${teamId}`;
  const checkoutUrl = `${process.env.BASE_URL}/checkout?teamId=${teamId}`;
  const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
  const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
  const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';
  const subscriptionKey = isProd ? 'stripe_subscription_id' : 'test_stripe_subscription_id';
  // Authentication
  const userAuthenticated = !!user && !!user.access_token;

  console.log('subscription data ', subscriptionData);

  // Define base home object
  let home = {
    /* the user that opened your app's app home */
    user_id: userId,
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
            "text": ":tada: *Welcome to Translate Channels*"
          }
        },
        {
          "type": "divider"
        }
      ]
    }
  }

  // Authentication block
  // Only add the authentication block if the team has an active subscription AND the user has not yet authenticated
  if (!userAuthenticated && subscriptionActive) {
    const authSection = buildAuthSection(auth_url);
    home.view.blocks.push(...authSection);
  }


  // Channel Translation Settings Section
  if (subscriptionActive) { // only show translation settings section if the team has an active subscription
    home.view.blocks.push({ type: 'divider' });

    let channelTranslationSettings = configureTranslationSettingsSection(team, userIsAdmin, nonAdminAllowSettings);
    home.view.blocks.push(...channelTranslationSettings);
  }


  // Slash Commands Section
  let slashCommands = configureSlashCommandsSection();
  if (subscriptionActive) { // only show slash commands section if the team has an active subscription
    home.view.blocks.push(...slashCommands);
  }
  
  // Manage Plan
  if (team && team.id) {
    if ((!team[subscriptionKey] || team[subscriptionKey] !== subscriptionData?.id) && subscriptionData?.id) { // add the Stripe subscription ID to firebase if it's not there yet
      console.log('updating subscription id')
      let updates = {};
      updates[subscriptionKey] = subscriptionData.id
      await teamsDB.updateTeam(teamId, updates);
    }
    
    // console.log('subscription data ', subscriptionData);
    console.log('subscription active ', subscriptionActive);
  
    if (subscriptionActive) { // show plan & usage data if the subscription is active
      home.view.blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Plan & Usage*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: !subscriptionActive ? "Set up your subscription to begin getting translations for your team :point_right: " : ":white_check_mark: Your subscription is active, and you have unlimited messages."
          },
          accessory: {
            type: 'button',
            action_id: 'manage_plan',
            text: {
              type: 'plain_text',
              text: !subscriptionActive ? 'Get Started' : 'Manage Plan'
            },
            url: !subscriptionActive ? checkoutUrl : portalUrl
          }
        }
      );
    } else { // if the team's subscription isn't active, show "Get Started" section
      const getStartedSection = buildGetStartedSection(checkoutUrl);
      home.view.blocks.push(...getStartedSection);
    }

  }

  return home;
}


const buildAuthSection = (auth_url) => {
  const authBlock = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ":u7a7a: *Approve Translation*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Authorize the app to update your messages with translations :point_right: \n _(Each user must do this once to enable automatic translation)_"
      },

      "accessory": {
        type: "button",
        action_id: "authorize_app",
        text: {
          type: "plain_text",
          text: "Authorize App"
        },
        url: auth_url
      }
    }
]

  return authBlock;
}



const configureTranslationSettingsSection = (team, userIsAdmin, nonAdminAllowSettings) => {
  let settingsSection = [];

  settingsSection.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Channel Translation Settings*'
    }
  });

  // Overall workspace settings that apply to every channel - holding it here until after sorting the channel settings alphabetically
  let everyChannel = {
    name: 'every_channel', 
    id: 'any_channel', 
    languages: team?.workspace_languages || []
  }

  let settings = [];

  // Go through the custom settings defined for each channel and push those to the settings array
  for (const key in team.channel_language_settings) {
    let channelSetting = team.channel_language_settings[key];
    if (channelSetting.languages?.length > 0) {
      settings.push(
        { name: channelSetting.name, id: channelSetting.id, languages: channelSetting.languages }
      );
    }
  }

  // Sort channels alphabetically
  settings = settings.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    } else {
      return 0;
    }
  })

  settings.unshift(everyChannel);

  for (const setting of settings) {
    // the languages length of 0 should be only possible for workspace settings which must exist by schema
    if (!setting.languages || setting.languages.length === 0) {
      const settingsBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${setting.name}\` No translation set`
        }
      };
      if (userIsAdmin || nonAdminAllowSettings) {
        settingsBlock.accessory = {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Edit'
          },
          action_id: 'settings_modal_opened',
          value: JSON.stringify({ id: setting.id, lang: setting.languages })
        };
      }
      settingsSection.push(settingsBlock);
      continue;
    }

    // Map language strings to array
    let languages = setting.languages.map(language => getSettingsString(language));
    // Pop the last item, so we can add "and" before it
    let lastLanguage = languages.pop();
    // Format the full string correctly
    // Need trailing space for Slack to render flag emoji properly
    let languagesString = languages.length > 0 ? `${languages.join(', ')}${languages.length > 1 ? ',' : ''} & ${lastLanguage} ` : `${lastLanguage} `;

    const settingsBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`${setting.name}\` translate any language :arrow_right: ${languagesString.slice(0, -1)}`
      }
    };

    if (userIsAdmin || nonAdminAllowSettings) {
      settingsBlock.accessory = {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Edit'
        },
        action_id: 'settings_modal_opened',
        value: JSON.stringify({ id: setting.id, lang: setting.languages })
      };
    }
    settingsSection.push(settingsBlock);
  }

  if (userIsAdmin || nonAdminAllowSettings) {
    settingsSection.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'You can add translation settings for any channel :point_right:'
        },
        accessory: {
          type: 'button',
          style: 'primary',
          text: {
            type: 'plain_text',
            text: 'Add Setting'
          },
          action_id: 'settings_modal_opened',
          value: JSON.stringify({ id: 'none', lang: [] })
        },
      });
  }

  return settingsSection;
}


const configureSlashCommandsSection = () => {
  return [
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Available Slash Commands*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '`/nt [YOUR MESSAGE]` to post a message to a channel without translating it'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "`/nt help` or `DIRECT MESSAGE the app above 👆` for FAQs & How-to's"
      }
    }
  ]
}

const buildGetStartedSection = (checkoutUrl) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':sparkles: *Get Started*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Choose a subscription to begin getting translations for your team :point_down: "
      }
    },
    {
      type: 'actions',
      elements: buildPriceButtons(checkoutUrl)
    }
  ]
}


const buildPriceButtons = (checkoutUrl) => {

  const buttonInfo = [
    {
      text: ':car:  Small - 5 users',
      url: addPlanToCheckoutUrl(checkoutUrl, 'small'),
      action_id: 'small_plan_click'
    },
    {
      text: ':boat:  Medium - 20 users',
      url: addPlanToCheckoutUrl(checkoutUrl, 'medium'),
      action_id: 'medium_plan_click'
    },
    {
      text: ':small_airplane:  Large - 80 users',
      url: addPlanToCheckoutUrl(checkoutUrl, 'large'),
      action_id: 'large_plan_click'
    },
    {
      text: ':rocket:  Unlimited - ∞ users',
      url: addPlanToCheckoutUrl(checkoutUrl, 'unlimited'),
      action_id: 'unlimited_plan_click'
    },
  ]

  const buttons = buttonInfo.map(info => {
    return {
      type: 'button',
      action_id: info.action_id,
      text: {
        type: 'plain_text',
        text: info.text
      },
      url: info.url
    }
  })
 
  return buttons;
}

const addPlanToCheckoutUrl = (checkoutUrl, plan) => {
  return `${checkoutUrl}&plan=${plan}`
}

export default buildHomeView;