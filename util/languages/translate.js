import autoBind from 'auto-bind';
import languageOperations from './languageOperations.js';
import GoogleTranslate from '@google-cloud/translate';
const { Translate } = GoogleTranslate.v2;
import stringOperator from './stringHelpers.js';
const translate = new Translate({projectId: 'translate-channels-d7fb1', key: process.env.TRANSLATE_API_KEY});

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
  }

  prepareTranslations () {
    this.translations = {};
    this.targetLanguages.forEach((item) => { this.translations[item] = null; });
    this.originalText = this.originalMessage.text;
  }

  textsToBeTranslated () {
    return Object.keys(this.translations).filter(key => this.translations[key] == null);
  }

  async translateText (text, target) {
    // Google Translate returns [translations, metadata]
    // metadata contains info about the detection
    let [translations, metadata] = await translate.translate(text, target);
    translations = Array.isArray(translations) ? translations : [translations];
    
    // Store the detected language from the first translation
    if (!this.inputLanguage && metadata?.data?.translations?.[0]?.detectedSourceLanguage) {
      this.inputLanguage = metadata.data.translations[0].detectedSourceLanguage;
      // Now that we know the source language, we can store the original text
      this.translations[this.inputLanguage] = this.originalText;
    }
    
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
    const undefinedResponse = null;
    if (!Array.isArray(this.targetLanguages) || this.targetLanguages.length === 0) { return undefinedResponse; }
    this.translatableString = this.stringOperator.getTranslateString();
    if (this.translatableString == null) { return undefinedResponse; }
    
    this.prepareTranslations();
    const toBeTranslated = this.textsToBeTranslated();
    await this.translateTexts(toBeTranslated);
    
    if (!this.inputLanguage || this.inputLanguage === 'und') { return undefinedResponse; }
    
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
