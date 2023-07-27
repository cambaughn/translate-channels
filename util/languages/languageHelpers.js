import supportedLanguages from './supportedLanguages.json' assert { type: 'json' };

const getSlackHeading = (languageCode) => {
  // takes language code returned by google and constructs a slack heading
  const language = supportedLanguages.find(element => element.languageCodes.includes(languageCode));
  if (!language.slackHeading) return language.languageName;
  if (language.slackHeadingType === 'emoji') return `:${language.slackHeading}:`;
  if (language.slackHeadingType === 'text') return language.slackHeading;
  return null;
};

const getSelectableLanguages = () => {
  // show only these languages to users to select -> will return whole language object
  const selectableLanguages = supportedLanguages.filter(element => element.selectable);
  return selectableLanguages.map(lang => modalSelectionObject(lang));
};

const getSettingsString = (langCode) => {
  const language = supportedLanguages.find(element => element.languageCodes.includes(langCode));
  if (!language.slackHeading) return '`language.languageName`';
  if (language.slackHeadingType === 'emoji') return `\`${language.languageName}\` :${language.slackHeading}:`;
  if (language.slackHeadingType === 'text') return `\`${language.slackHeading}\``;
  return null;
};

const getModalOption = (langCode) => {
  const language = supportedLanguages.find(element => element.languageCodes.includes(langCode));
  return modalSelectionObject(language);
};

const modalSelectionObject = (lang) => {
  let string = null;
  if (!lang.slackHeading) { string = lang.languageName; }
  if (lang.slackHeadingType === 'emoji') { string = `${lang.languageName} :${lang.slackHeading}:`; }
  if (lang.slackHeadingType === 'text') { string = `${lang.slackHeading}`; }
  return {
    text: {
      type: 'plain_text',
      text: string,
      emoji: true
    },
    value: lang.languageCodes[0]
  };
};

export {
  getSettingsString,
  getSlackHeading,
  getSelectableLanguages,
  getModalOption
}
