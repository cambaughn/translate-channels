import autoBind from 'auto-bind';

const supportedSpecialCharacters = [
  {
    type: 'emoji',
    operation: 'keepOriginal',
    regEx: /:\S+:/gim,
    customOpenTag: '$ -',
    customCloseTag: '- $'
  },
  {
    type: 'code',
    operation: 'keepOriginal',
    regEx: /`\w{1}(\w|\s)*\w{1}`/gim,
    customOpenTag: '& -',
    customCloseTag: '- &'
  },
  {
    type: 'link',
    operation: 'keepOriginal',
    regEx: /\x3c\S+\x3e/gim,
    customOpenTag: '^ -',
    customCloseTag: '- ^'
  },
  {
    type: 'codeBlock',
    operation: 'keepOriginal',
    regEx: /```\w{1}(\w|\s)*\w{1}```/gim,
    customOpenTag: '% -',
    customCloseTag: '- %'
  },
  {
    type: 'boldText',
    operation: 'editTranslation',
    regEx: /\x2A\w{1}(\w|\s)*\w{1}\x2A/gim,
    originalTag: '*',
    customOpenTag: '(-',
    customCloseTag: '-)'
  },
  {
    type: 'strikethroughText',
    operation: 'editTranslation',
    regEx: /~\w{1}(\w|\s)*\w{1}~/gim,
    originalTag: '~',
    customOpenTag: '#-',
    customCloseTag: '-#'
  }
];

class stringOperator {
  constructor (originalMessageText) {
    this.originalMessageText = originalMessageText;
    this.keptOriginals = [];
    this.toEdit = [];
    autoBind(this);
  }

  setCharAt (str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substr(0, index) + chr + str.substr(index + 1);
  }

  shouldTranslate () {
    if (typeof (this.originalMessageText) !== 'string') { return false; }
    if (this.originalMessageText.length === 0) { return false; }
    if (this.originalMessageText.toLowerCase().startsWith('\nt')) { return false; }
    let editedString = this.originalMessageText;
    for (const specialChar of supportedSpecialCharacters) {
      if (specialChar.operation === 'editTranslation') { continue; }
      editedString = editedString.replace(specialChar.regEx, '');
    }
    editedString = editedString.replace(/\s/g, '');
    if (editedString.length === 0) { return false; }
    return true;
  }

  getTranslateString () {
    if (!this.shouldTranslate()) { return null; }
    let returnString = this.originalMessageText;
    for (const specialChar of supportedSpecialCharacters) {
      const matchResults = returnString.match(specialChar.regEx);
      if (matchResults == null) { continue; }
      if (specialChar.operation === 'keepOriginal') {
        for (const match of matchResults) {
          returnString = returnString.replace(match, `${specialChar.customOpenTag}${this.keptOriginals.length}${specialChar.customCloseTag}`);
          this.keptOriginals[this.keptOriginals.length] = { text: match, type: specialChar.type };
        }
      } else if (specialChar.operation === 'editTranslation') {
        for (const match of matchResults) {
          const index = returnString.indexOf(match);
          returnString = this.setCharAt(returnString, index, specialChar.customOpenTag + ' ');
          returnString = this.setCharAt(returnString, index + match.length + specialChar.customCloseTag.length - 1, ' ' + specialChar.customCloseTag);
          this.toEdit[this.toEdit.length] = specialChar.type;
        }
      }
    }
    return returnString;
  }

  rebuildString (entryString) {
    let exitString = entryString;
    for (const [index, keptElement] of this.keptOriginals.entries()) {
      const specialChar = supportedSpecialCharacters.find(e => e.type === keptElement.type);
      const replaceString = `${specialChar.customOpenTag}${index}${specialChar.customCloseTag}`;
      exitString = exitString.replace(replaceString, keptElement.text);
    }
    for (const editType of this.toEdit) {
      const specialChar = supportedSpecialCharacters.find(e => e.type === editType);
      exitString = exitString.replace(specialChar.customOpenTag + ' ', specialChar.originalTag);
      exitString = exitString.replace(' ' + specialChar.customCloseTag, specialChar.originalTag);
    }
    return exitString;
  }
}

export default stringOperator;
