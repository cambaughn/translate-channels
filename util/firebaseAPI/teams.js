import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';
import convertFromFirebase from '../firebase/converter.js';

const teamsDB = {};

// Get single team document from Firebase
teamsDB.getTeam = async (id) => {
  const teamRef = teamsDoc(id);
  let team = await getDoc(teamRef);
  team = convertFromFirebase(team);

  return Promise.resolve(team);
}

// Create (or update existing) team in Firebase
teamsDB.updateTeam = async (id, updates) => {
  const teamRef = teamsDoc(id);
  return setDoc(teamRef, updates, { merge: true });
}

teamsDB.createNew = async (id) => {
  let defaultTeam = {
    slack_team_id: id,
    workspace_languages: [],
    channel_language_settings: [],
    admin_settings: {}
  }

  return teamsDB.updateTeam(id, defaultTeam);
}

// Deactivate team by removing Slack app keys - when uninstalling
teamsDB.deactivateTeam = async (id) => {
  let updates = {
    // Remove Slack details
    bot_user_id: null,
    team_access_token: null,
    // Remove Stripe details - subscription only - will leave customer_id so they can sign up again if they ever want to, and it will keep their payment info and history
    stripe_subscription_id: null,
    test_stripe_subscription_id: null
  }

  return teamsDB.updateTeam(id, updates);
}

// Delete team from Firebase - USE CAREFULLY - really shouldn't be used outside of testing
teamsDB.deleteTeam = async (id) => {
  const teamRef = teamsDoc(id);
  return deleteDoc(teamRef);
}


// Update team's language settings
teamsDB.updateLanguageSettings = async (channels, languages, teamId) => {
  const do_not_translate = languages.includes('do_not_translate');
  if (do_not_translate) {
    // set languages array to be empty
    languages = [];
  }

  // Then, depending on whether it's a bunch of channels or the workspace, we update the correct language array
  if (channels.length > 0) { // Channel
    // Get team so we can update only the necessary objects in the channel_language_settings array
    const team = await teamsDB.getTeam(teamId);
    let updatedChannels = {};

    channels.forEach(channel => {
      updatedChannels[channel.id] = {
        id: channel.id,
        name: channel.name,
        languages
      }
    })

    const updatedSettings = mergeSettings(team.channel_language_settings, updatedChannels);
    console.log('updates ', updatedSettings);

    return teamsDB.updateTeam(teamId, { channel_language_settings: updatedSettings });
  } else { // Workspace as a whole
    return teamsDB.updateTeam(teamId, { workspace_languages: languages });
  }
}

// Mongodb migration

/**
 * Formats a team object from Mongodb into the proper object for Firebase
 * @function
 * @param {object} team - Single team object from Mongodb
 * @returns {object} - Formatted team for Firebase
 */
teamsDB.formatTeam = (team) => {
  let formattedTeam = {
    slack_team_id: team.slackTeamId,
    team_access_token: team.workspaceToken,
    bot_user_token: team.botId,
    workspace_languages: team.settings?.workspace?.outputLanguages || [],
    channel_language_settings: {}
  };

  team.settings.channel.forEach(channel => {
    let channelSettings = {
      id: channel.id,
      name: channel.name,
      languages: channel.outputLanguages || []
    };

    formattedTeam.channel_language_settings[channel.id] = channelSettings;
  });

  return formattedTeam;
}


// Helpers
const teamsDoc = (id) => {
  return doc(db, 'teams', id);
}


const mergeSettings = (existing, updates) => {
  let updatedSettings = { ...existing };
  for (let key in updates) {
    updatedSettings[key] = updates[key];
  }

  return updatedSettings;
}

export { mergeSettings };
export default teamsDB;