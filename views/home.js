import teamsDB from "../util/firebaseAPI/teams.js";
import userDB from "../util/firebaseAPI/users.js";
import { getSettingsString } from '../util/languages/languageHelpers.js';
import { getSubscriptionData } from "../util/stripe/stripe.js";

const buildHomeView = async (userId, teamId, redirect_url, userIsAdmin, nonAdminAllowSettings) => {
  let auth_url = `https://slack.com/oauth/v2/authorize?scope=channels:read,chat:write,commands,im:history,users:read&user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

  let team = {};
  if (teamId) {
    team = await teamsDB.getTeam(teamId);
  }
  let user = await userDB.getUser(userId);
  if (!team.slack_team_id && teamId) { // if the team doesn't exist yet, we need to create it
    await teamsDB.createNew(teamId);
    team = await teamsDB.getTeam(teamId);
  }


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
            "text": "*Welcome to Translate Channels* :tada:"
          }
        },
        {
          "type": "divider"
        }
      ]
    }
  }

  const userAuthenticated = !!user && !!user.access_token;
  const authBlock = {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": userAuthenticated ? "You've authenticated the app :thumbsup: " : "Authorize the app to update your messages with translations :point_right: \n _(Each user must do this once to enable automatic translation)_"
    }
  }

  if (!user || !user.access_token) {
    authBlock.accessory = {
      type: "button",
      action_id: "authorize_app",
      text: {
        type: "plain_text",
        text: "Authorize App"
      },
      url: auth_url
    }
  }


  home.view.blocks.push(
    authBlock,
    {
      "type": "divider"
    }
  )

  // Channel Translation Settings
  home.view.blocks.push({
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
      home.view.blocks.push(settingsBlock);
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
    home.view.blocks.push(settingsBlock);
  }

  if (userIsAdmin || nonAdminAllowSettings) {
    home.view.blocks.push(
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

  // Slash Commands
  let slashCommands = configureSlashCommandsSection();
  home.view.blocks.push(...slashCommands);

  
  // Manage Plan
  const isProd = process.env.ENVIRONMENT !== 'development';
  const portalUrl = `${process.env.BASE_URL}/portal?teamId=${teamId}`;
  const checkoutUrl = `${process.env.BASE_URL}/checkout?teamId=${teamId}`;
  const customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;
  const subscriptionData = customerId ? await getSubscriptionData(customerId) : null;
  const subscriptionActive = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';
  const subscriptionKey = isProd ? 'stripe_subscription_id' : 'test_stripe_subscription_id';

  if ((!team[subscriptionKey] || team[subscriptionKey] !== subscriptionData?.id) && subscriptionData?.id) {
    console.log('updating subscription id')
    let updates = {};
    updates[subscriptionKey] = subscriptionData.id
    await teamsDB.updateTeam(teamId, updates);
  }
  // console.log('subscription data ', subscriptionData);
  console.log('subscription active ', subscriptionActive);

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
        text: !subscriptionActive ? "Set up your subscription to begin getting translations for your team :point_right: " : "Your subscription is active, and you have unlimited messages."
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

  return home;
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

export default buildHomeView;