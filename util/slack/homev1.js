// const languageOperations = require('../../translation_engine/language_operations');

const homeView = ({ authUser, authUrl, settings, isAdminUser, nonAdminAllowSettings, email, subscription, teamId }) => {
  let view = {
    type: 'home',
    callback_id: 'home_view',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Welcome to Translate Channels for Slack* :tada:\n\nMake sure the app is authorized to edit your messages :point_down: *[EVERY USER MUST DO THIS]*'
        }
      }
    ]
  }
  let msg = ':octagonal_sign: You need to authorize the app or we *cannot* translate your messages';
  if (authUser) {
    msg = ':white_check_mark: You have authorized the app and your messages will be translated';
  }
  view.blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: msg
    }
  });
  if (!authUser) {
    view.blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Authorize'
          },
          style: 'primary',
          url: authUrl
        }
      ]
    });
  } else {
    view.blocks.push({ type: 'divider' }, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Channel Translation Settings*'
      }
    });
    const printableSettings = [{ name: 'every_channel', id: 'any_channel', languages: settings.workspace.outputLanguages }];
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
        view.blocks.push(settingsBlock);
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
      view.blocks.push(settingsBlock);
    }
    if (isAdminUser || nonAdminAllowSettings) {
      view.blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'You can add translation settings for any channel'
          },
          accessory: {
            type: 'button',
            style: 'primary',
            text: {
              type: 'plain_text',
              text: 'Add Setting'
            },
            action_id: 'edit_setting_modal_open',
            value: JSON.stringify({ id: 'none', lang: [] })
          }
        });
    }
    view.blocks.push(
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
    if (isAdminUser) {
      const nonAdminTextMsg = nonAdminAllowSettings ? 'Non-admins are *allowed* to change channel settings' : 'Non-admins are *not* allowed to change channel settings';
      const nonAdminButtonMsg = nonAdminAllowSettings ? 'Disallow' : 'Allow';
      const nonAdminButtonStyle = nonAdminAllowSettings ? 'danger' : 'primary';
      const nonAdminSetValue = !nonAdminAllowSettings;
      view.blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*ADMIN AREA*'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*App Settings*'
          }
        });
      view.blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: nonAdminTextMsg
          },
          accessory: {
            type: 'button',
            style: nonAdminButtonStyle,
            text: {
              type: 'plain_text',
              text: nonAdminButtonMsg
            },
            action_id: 'edit_admin_setting_submission',
            value: `${nonAdminSetValue}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Plan & Usage*'
          }
        }
      );
      if (email) {
        view.blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Your invoice e-mail: *${email}*`
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Change E-mail'
              },
              action_id: 'edit_email_modal_open',
              value: email
            }
          }
        );
      } else {
        view.blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Add an e-mail address to receive invoices.'
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Add E-mail'
              },
              action_id: 'edit_email_modal_open'
            }
          }
        );
      }
      view.blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Currently on *${subscription.planName}* - total cost $${subscription.price} p/m. Used ${Math.round(subscription.charactersTranslated / subscription.charLimit * 100)}% (${subscription.charactersTranslated.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}) characters out of ${subscription.charLimit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} and ${subscription.messagesSent} out of ${subscription.msgLimit} messages. Please refer to <https://ukhired.com/translate-channels-for-slack|our website> for detailed pricing info.\n\nRenews on *${subscription.renewalDate.toDateString().substr(4)}*.\n\nTo cancel your subscription - delete the app from Slack`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Manage Plan'
            },
            url: process.env.STRIPE_PORTAL_URI + '?teamId=' + teamId
          }
        }
      );
    } else {
      view.blocks.push(
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
            text: 'Contact your Slack team admin to change/cancel plan.'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Currently on *${subscription.planName}*. Used ${Math.round(subscription.charactersTranslated / subscription.charLimit * 100)}% (${subscription.charactersTranslated.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}) characters out of ${subscription.charLimit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} and ${subscription.messagesSent} out of ${subscription.msgLimit} messages. Renews on *${subscription.renewalDate.toDateString().substr(4)}*.`
          }
        }
      );
    }
  }
  view.blocks.push(
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Get in touch if you need any help:_ <mailto:slack-app@ukhired.com|slack-app@ukhired.com>'
      }
    },
    {
      type: 'divider'
    }
  );
  return view;
}

module.exports.homeView = homeView;
