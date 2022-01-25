import GoogleTranslate from '@google-cloud/translate';
const { Translate } = GoogleTranslate.v2;
const translate = new Translate();
import stringOperator from './stringHelpers.js';



const getTranslations = (message, targetLanguages) => {
  let stringHelper = new stringOperator(message.text);
  let translatableString = stringHelper.getTranslateString();

  return Promise.resolve('translation :smile: ');
} 

export { getTranslations }