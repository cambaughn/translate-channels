let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

const authMessage = [
      {
          "type": "section",
          "text": {
              "type": "mrkdwn",
              "text": "Your admin has set up automatic translations for your workspace. Please authorize the Translate Channels app to enable translation of your messages."
          }
      },
      {
          "type": "actions",
          "elements": [
              {
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "text": "Authorize Translate Channels",
                      "emoji": true
                  },
                  "value": "click_auth",
                  "action_id": "action_auth",
                  "url": auth_url
              }
          ]
      }
  ]

export default authMessage;
