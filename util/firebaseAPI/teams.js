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
    // return Promise.all(channels.map(channel => ))
  } else { // Workspace as a whole
    return teamsDB.updateTeam(teamId, { workspace_languages: languages });
  }
}


// Helpers
const teamsDoc = (id) => {
  return doc(db, 'teams', id);
}

export default teamsDB;