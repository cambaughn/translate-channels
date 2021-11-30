import { doc, setDoc, getDoc } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';

const userDB = {};

// Get single user document from Firebase
userDB.getUser = async (id) => {
  const userRef = usersDoc('UJfupE0S0amoXtzdzKMR');
  let user = await getDoc(userRef);
  console.log('user ', user );
}

// Helpers
const usersDoc = (id) => {
  return doc(db, 'users', id);
}

export default userDB;