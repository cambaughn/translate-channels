import teamsDB from "../util/firebaseAPI/teams.js";
import userDB from "../util/firebaseAPI/users.js";
import { getSettingsString } from '../util/languages/languageHelpers.js';
import { getSubscriptionData, getSubscriptionUsage, getSubscriptionTierDetails, subscriptionTierDetails, meteredUsagePriceId } from "../util/stripe/stripe.js";
import { getUserInfo } from "../util/slack/slackUser.js";

// NOTE: Only putting dividers at the BOTTOM of each section

const buildHomeView = async (userId, teamId, redirect_url, userIsAdmin, client) => {
  console.log('building home view for ', userId)
  let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

  let user = await userDB.getUser(userId);
  let team = {};
  // TODO: if we want to allow non admins to change settings, set this to true (for global rule) OR add field to db for each team
  const nonAdminAllowSettings = true;
  const nonAdminAllowSubscriptionChange = false;

  if (teamId) {
    team = await teamsDB.getTeam(teamId);
    console.log('getting team in homeview ', teamId);
    // Record team viewing the homescreen for the first time
    if (!team?.viewed_app_home) {
      teamsDB.updateTeam(teamId, { viewed_app_home: true })
    }
  }

  if (!user?.name && !user?.display_name) {
    // Get user info from Slack and update Firebase
    let slackUserInfo = await getUserInfo(userId, team.team_access_token, client);  
    console.log('got User info from Slack', slackUserInfo);

    let userUpdates = {
      name: slackUserInfo?.real_name || null,
      display_name: slackUserInfo?.profile?.display_name || null
    }

    await userDB.updateUser(userId, userUpdates)
  }


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
    let channelTranslationSettings = buildTranslationSettingsSection(team, userIsAdmin, nonAdminAllowSettings);
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
    // console.log('subscription active ', subscriptionActive);
    
    if (subscriptionActive) { // show plan & usage data if the subscription is active
      const numUsers = await userDB.getRegisteredUsersForTeam(teamId);
      let subscriptionUsage = null;
      if (subscriptionData?.plan?.usage_type === 'metered') {
        subscriptionUsage = await getSubscriptionUsage(subscriptionData);
      }
      const managePlanSection = buildManagePlanSection(subscriptionData, numUsers, portalUrl, userIsAdmin || nonAdminAllowSubscriptionChange, subscriptionUsage);
      home.view.blocks.push(...managePlanSection);
    } else { // if the team's subscription isn't active, show "Get Started" section
      const getStartedSection = buildGetStartedSection(checkoutUrl, userIsAdmin || nonAdminAllowSubscriptionChange);
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
        "text": "Authorize the app to update your messages with translations :point_right: \n _(Each user must authorize the app to enable automatic translation)_"
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
    },
    {
      type: 'divider'
    }
  ]

  return authBlock;
}



const buildTranslationSettingsSection = (team, userIsAdmin, nonAdminAllowSettings) => {
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
    name: 'All Channels', 
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
  // console.log('everyChannel: ', everyChannel);
  settings.unshift(everyChannel);

  for (const setting of settings) {
    // the languages length of 0 should be only possible for workspace settings which must exist by schema

    let channelName = setting.id === 'any_channel' ? 'Every Channel' : `<#${setting.id}>`
    
    if (!setting.languages || setting.languages.length === 0) {
      const settingsBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${channelName}\` No translation set`
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
        text: `\`${channelName}\` translate any language :arrow_right: ${languagesString.slice(0, -1)}`
      }
    };

    // if (userIsAdmin || nonAdminAllowSettings) {
    //   settingsBlock.accessory = {
    //     type: 'button',
    //     text: {
    //       type: 'plain_text',
    //       text: 'Edit'
    //     },
    //     action_id: 'settings_modal_opened',
    //     value: JSON.stringify({ id: setting.id, lang: setting.languages })
    //   };    
      
      if (userIsAdmin || nonAdminAllowSettings) {

        
      settingsBlock.accessory = {
        type: "overflow",
        options: [
          {
            text: {
              type: "plain_text",
              text: "Edit Settings"
            },
            value: JSON.stringify({ type: 'edit_settings', id: setting.id, lang: setting.languages })
          },
          {
            text: {
              type: "plain_text",
              text: "Remove Channel"
            },
            value: JSON.stringify({ type: 'remove_channel_settings', id: setting.id, lang: setting.languages })
          }
        ],
        action_id: "overflow_selected"
        // action_id: 'settings_modal_opened',
        // value: JSON.stringify({ id: setting.id, lang: setting.languages })
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
          text: 'Add translation settings for any channel :point_right:'
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

  settingsSection.push(
    {
      type: 'divider'
    }
  )

  return settingsSection;
}


const configureSlashCommandsSection = () => {
  return [
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
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "\n\n"
      }
    },
    {
      type: 'divider'
    }
  ]
}


const buildManagePlanSection = (subscriptionData, numUsers, portalUrl, userIsAdmin, subscriptionUsage) => {
  let sectionText = '';
  const usageType = subscriptionData?.plan?.usage_type;

  if (usageType === 'licensed') { // new pricing - tiers 
    const tierDetails = getSubscriptionTierDetails(subscriptionData.plan.id);
    let upgradeNeeded = !tierDetails.unlimited && numUsers > tierDetails.maxUsers // There are more registered users than allowed on the current plan
  
    if (!tierDetails.unlimited) { // Team is not on unlimited plan
      if (!upgradeNeeded) { // plan is active and in good standing
        sectionText += `:white_check_mark:  Subscription active\n\n`;
        sectionText += `Your team is currently on the *${tierDetails.name} subscription* with unlimited translations for up to *${tierDetails.maxUsers} users*.\n\nYou currently have *${numUsers} registered user${ numUsers === 1 ? '' : 's'}*.`
      } else { // upgrade needed
        sectionText += `:warning:  Upgrade needed\n\n`;
        sectionText += `Your team is currently on the *${tierDetails.name} subscription* with unlimited translations for up to *${tierDetails.maxUsers} users*.\n\nYou now have *${numUsers} registered users* and need to upgrade your plan to continue getting translations.\n\n`
        sectionText += '*How to upgrade* \n\n' 
        sectionText += "Click the `Manage Plan` button to visit your customer portal where you can see pricing details and upgrade your plan. :point_right: \n\n";
      }
      
    } else { // the team is on the unlimited plan
      sectionText += `:white_check_mark:  Subscription active\n\n`
      sectionText += `Your team is currently on the *${tierDetails.name} subscription* with translations for *unlimited users*.\n\nYou currently have *${numUsers} registered user${ numUsers === 1 ? '' : 's'}*.`
    }

    sectionText += `_Note: we've recently updated our pricing for new customers. Your team is still on our tier-based plan, and you can keep that plan for as long as you want._\n\n`
    sectionText += `_However, if the new pricing tiers would work better for you, we'd be happy to switch you over. You can visit the <http://www.translatechannels.com|Translate Channels site> to find more details on the new subscriptions._`
    sectionText += `_Reach out to us at team@translatechannels.com to update your plan_`
  } else if (usageType === 'metered') { // new pricing - $4/user/month
    sectionText += `:white_check_mark:  Subscription active\n\n`
    sectionText += `Your team is currently on the *Unlimited subscription* with translations for *unlimited users*.\n\n`
    sectionText += `So far, your team has ${subscriptionUsage || 0} active ${subscriptionUsage === 1 ? 'user' : 'users'} this month.`
  }
  

  let managePlanSection = [
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
        text: sectionText
      }
    }
  ]

  if (userIsAdmin) {
    managePlanSection[1].accessory = {
      type: 'button',
      action_id: 'manage_plan',
      text: {
        type: 'plain_text',
        text: ':gear:  Manage Plan'
      },
      url: portalUrl
    }
  }
  return managePlanSection;
}

const buildGetStartedSection = (checkoutUrl, userIsAdmin) => {
  let getStartedSection = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Try Translate Channels free for 7 days*\n\n_$4/user/month after_'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "\n\n"
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:sparkles: *Features*\n\n:white_check_mark:  Unlimited message translations\n\n:white_check_mark:  Custom language settings for each channel\n\n:white_check_mark:  In-message translation - no bots or clutter`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '\n\n'
      }
    }
  ]

  let priceUrl = addPlanToCheckoutUrl(checkoutUrl, meteredUsagePriceId);

  if (userIsAdmin) {
    getStartedSection[0].accessory = {
      type: "button",
      action_id: "unlimited_plan_click",
      text: {
        type: "plain_text",
        text: `:rocket:  Get Started`
      },
      url: priceUrl
    }
  }

  return getStartedSection;
}


const addPlanToCheckoutUrl = (checkoutUrl, plan) => {
  return `${checkoutUrl}&plan=${plan}`
}

export default buildHomeView;