import { doc, setDoc, getDoc } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';
import convertFromFirebase from '../firebase/converter.js';

const userDB = {};

// Get single user document from Firebase
userDB.getUser = async (id) => {
  const userRef = usersDoc('UJfupE0S0amoXtzdzKMR');
  let user = await getDoc(userRef);
  user = convertFromFirebase(user);
  console.log('user ', user );
  return Promise.resolve(user);
}

// Helpers
const usersDoc = (id) => {
  return doc(db, 'users', id);
}

export default userDB;