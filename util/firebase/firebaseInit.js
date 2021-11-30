// import firebaseConfig from './firebaseConfig';
// const firebase = require('firebase/app');
// require('firebase/firestore')
// const firebaseConfig = require('./firebaseConfig');

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from './firebaseConfig.js';

// import {default as firebase} from 'firebase/app';
// import 'firebase/firestore';

try {
  initializeApp(firebaseConfig);
} catch(error) {
  if (!/already exists/.test(error.message)) {
  console.error('Firebase initialization error', error.stack)
  }
}


// Initialize Cloud Firestore through Firebase
let db = getFirestore();



export default db;
