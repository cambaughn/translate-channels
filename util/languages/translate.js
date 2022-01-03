import autoBind from 'auto-bind';
import languageOperations from './languageOperations.js';
import GoogleTranslate from '@google-cloud/translate';
const { Translate } = GoogleTranslate.v2;
import stringOperator from './stringHelpers.js';
const translate = new Translate({projectId: 'slack-app-1590561953103', key: 'AIzaSyDMBqVhH_5u-jpMpMDWCoKjbf_EwoQl8yQ'});

// NOTE: Translator doesn't handle italics - leaves untranslated. It does handle bolding, which is odd. Probably don't need to handle unless users complain.
class Translator {
  constructor (slackMessage, targetLanguagesArray) {
    // slackMessage should be full message object, not message.text
    this.originalMessage = {};
    this.originalMessage = Object.assign(this.originalMessage, slackMessage);
    this.targetLanguages = targetLanguagesArray;
    this.characterCount = 0;
    this.stringOperator = new stringOperator(this.originalMessage.text);
    autoBind(this);

    console.log('testing translations ');
  }

  async detectInputLanguage () {
    let [detections] = await translate.detect(this.originalMessage.text);
    detections = Array.isArray(detections) ? detections : [detections];
    return detections[0].language;
  }

  prepareTranslations () {
    this.translations = {};
    this.targetLanguages.forEach((item) => { this.translations[item] = null; });
    this.translations[this.inputLanguage] = this.originalMessage.text;
  }

  textsToBeTranslated () {
    return Object.keys(this.translations).filter(key => this.translations[key] == null);
  }

  async translateText (text, target) {
    // Translates the text into the target language. "text" can be a string for
    // translating a single piece of text, or an array of strings for translating
    // multiple texts.
    let [translations] = await translate.translate(text, target);
    translations = Array.isArray(translations) ? translations : [translations];
    return translations[0];
  }

  async translateTexts (toBeTranslated) {
    for (const language of toBeTranslated) {
      const translation = await this.translateText(this.translatableString, language);
      this.translations[language] = translation;
      this.characterCount += this.translatableString.length;
    }
  }

  constructTextOutput () {
    this.response = '';
    // Need to place 
    Object.keys(this.translations).forEach(language => {
      const slackHeading = languageOperations.getSlackHeading(language);
      const rebuiltText = this.stringOperator.rebuildString(this.translations[language]);
      const source = (language === this.inputLanguage) ? ' >' : '';
      this.response += `${slackHeading + source} ${rebuiltText}`;
      const divider = '\n\n';
      this.response += divider;
    });
  }

  async getTranslatedData () {
    // give full message, receive full message -> all the translation logic will be abstracted into this
    // use .characterCount to see how much was translated
    // use .response to show User
    const undefinedResponse = null;
    if (!Array.isArray(this.targetLanguages) || this.targetLanguages.length === 0) { return undefinedResponse; }
    this.translatableString = this.stringOperator.getTranslateString();
    if (this.translatableString == null) { return undefinedResponse; }
    this.inputLanguage = await this.detectInputLanguage();
    if (this.inputLanguage === 'und') { return undefinedResponse; }
    this.prepareTranslations();
    const toBeTranslated = this.textsToBeTranslated();
    await this.translateTexts(toBeTranslated);
    this.constructTextOutput();
    return {
      response: this.response,
      characterCount: this.characterCount,
      targetLanguages: this.targetLanguages,
      inputLanguage: this.inputLanguage
    };
  }
}

export default Translator;
