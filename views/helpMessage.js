const helpMessage = () => {
  let answer = '*FAQs*\n\n\n';
  answer += ":question: *My messages aren't being translated* > Every user must approve the app to translate their messages. This needs to be done *only once*, you can find the button in the *app settings*.\n\n";
  answer += ':question: *Can I set different settings for different channels* > Yes, translation settings can be added to any public or private channel.\n\n';
  answer += ':question: *Can I translate messages in private channels or direct messages* > Yes! Private channels are currently supported, and we are exploring supporting DMs as well. Please let us know if this is a key feature for your team.\n\n';
  answer += ':question: *Does every message have to be translated* > No, use the command `/nt [YOUR MESSAGE]`and the app will ignore it.\n\n';
  // answer += ':question: *How do I upgrade* > If you are the admin of the workspace, you will see a `Manage Plan` button at the bottom of App Settings. This will take you to your customer portal where you can upgrade/downgrade your plan.\n\n';
  // answer += ':question: *How do I cancel* > Simply delete the app from the workspace and your subscription will be canceled after the current billing period.\n\n';
  answer += ':question: *How do I cancel* > Click on the `Manage Plan` button at the bottom of App Settings and cancel your plan. Your subscription will be canceled after the current billing period.\n\n';
  answer += ':question: *How can I get in touch with you* > If you have a support issue, want to provide some feedback or for any other questions, please email <mailto:team@translatechannels.com|team@translatechannels.com>\n\n';
  return answer;
}

export default helpMessage;
