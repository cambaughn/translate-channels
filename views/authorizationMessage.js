let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

const authorizationMessage = [
      {
          "type": "section",
          "text": {
              "type": "mrkdwn",
              "text": "Please authenticate to use the Translate Channels feature."
          }
      },
      {
          "type": "actions",
          "elements": [
              {
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "text": "Authenticate",
                      "emoji": true
                  },
                  "value": "click_authenticate",
                  "action_id": "action_authenticate",
                  "url": auth_url
              },
              {
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "text": "Dismiss",
                      "emoji": true
                  },
                  "value": "click_dismiss",
                  "action_id": "action_dismiss"
              }
          ]
      }
  ]

export default authorizationMessage;
