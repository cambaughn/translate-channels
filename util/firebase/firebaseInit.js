// import firebaseConfig from './firebaseConfig';
const firebase = require('firebase/app');
require('firebase/firestore')

const firebaseConfig = require('./firebaseConfig');

try {
  firebase.default.initializeApp(firebaseConfig);
} catch(error) {
  if (!/already exists/.test(error.message)) {
  console.error('Firebase initialization error', error.stack)
  }
}


// Initialize Cloud Firestore through Firebase
let db = firebase.default.firestore();

// Disable deprecated features
db.settings({
});

module.exports = db;
