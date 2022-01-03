import GoogleTranslate from '@google-cloud/translate';
const { Translate } = GoogleTranslate.v2;
const translate = new Translate();
import stringOperator from './stringHelpers.js';



const getTranslations = (message, targetLanguages) => {
  console.log('message ', message);
  let stringHelper = new stringOperator(message.text);
  let translatableString = stringHelper.getTranslateString();
  console.log('string -> ', translatableString);

  return Promise.resolve('translation :smile: ');
} 

export { getTranslations }