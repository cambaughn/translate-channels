import teamsDB from "../firebaseAPI/teams.js";

const buildHomeView = async (event, settings = { channel: [] }, redirect_url) => {
  let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;
  let team = await teamsDB.getTeam('123');
  console.log('got team =====> ', team);

  let home = {
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
  }

  // Channel Translation Settings
  home.view.blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Channel Translation Settings*'
    }
  });

  const printableSettings = [{ name: 'every_channel', id: 'any_channel', languages: settings?.workspace?.outputLanguages || [] }];
  for (const channelSetting of settings.channel) {
    printableSettings.push(
      { name: channelSetting.name, id: channelSetting.id, languages: channelSetting.outputLanguages }
    );
  }

  for (const setting of printableSettings) {
    // the languages length of 0 should be only possible for workspace settings which must exist by schema
    if (!setting.languages || setting.languages.length === 0) {
      const settingsBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`${setting.name}\` DO NOT TRANSLATE`
        }
      };
      if (isAdminUser || nonAdminAllowSettings) {
        settingsBlock.accessory = {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Edit'
          },
          action_id: 'edit_setting_modal_open',
          value: JSON.stringify({ id: setting.id, lang: setting.languages })
        };
      }
      home.view.blocks.push(settingsBlock);
      continue;
    }

    let languagesString = '';
    // for (const lang of setting.languages) { languagesString += languageOperations.getSettingsString(lang); }

    const settingsBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`${setting.name}\` translate any language into -> ${languagesString.slice(0, -1)}`
      }
    };
    // if (isAdminUser || nonAdminAllowSettings) {
    //   settingsBlock.accessory = {
    //     type: 'button',
    //     text: {
    //       type: 'plain_text',
    //       text: 'Edit'
    //     },
    //     action_id: 'edit_setting_modal_open',
    //     value: JSON.stringify({ id: setting.id, lang: setting.languages })
    //   };
    // }
    home.view.blocks.push(settingsBlock);
  }

  // Slash Commands
  home.view.blocks.push(
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
  );

  return home;
}

export default buildHomeView;