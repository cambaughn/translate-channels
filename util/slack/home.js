const buildHomeView = (event, redirect_url) => {
  let auth_url = `https://slack.com/oauth/v2/authorize?user_scope=channels:history,chat:write&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_url}`;

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

  return home;
}

export default buildHomeView;