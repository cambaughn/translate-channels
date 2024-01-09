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
                  "action_id": "action_authenticate"
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
