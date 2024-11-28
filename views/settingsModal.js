import { getSelectableLanguages, getModalOption } from "../util/languages/languageHelpers.js";

const buildSettingsModal = (value) => {
  console.log('value ! ', value)
  let blocks = [
    {
      type: 'input',
      block_id: 'select_lang_block',
      label: {
        type: 'plain_text',
        text: value.id === 'any_channel' ? 'Add target languages for every channel' : 'Add target languages'
      },
      element: {
        type: 'multi_static_select',
        action_id: 'select_lang',
        max_selected_items: 7,
        placeholder: {
          type: 'plain_text',
          text: 'Select languages',
          emoji: true
        },
        options: getSelectableLanguages()
      }
    }
  ];

  if (value.id !== 'any_channel') {
    blocks.unshift(
      {
        type: 'section',
        block_id: 'select_channel_block',
        text: {
          type: 'mrkdwn',
          text: 'Select channels to translate'
        },
        accessory: {
          type: 'multi_conversations_select',
          action_id: 'select_channel',
          initial_conversations: value.id !== 'none' ? [value.id] : [],
          filter: { include: ['public', 'private']},
          placeholder: {
            type: 'plain_text',
            text: 'Select channels',
            emoji: true
          },
          focus_on_load: false
        }
      },
      {
        type: "context",
        block_id: "private_channel_warning",
        elements: [{
          type: "mrkdwn",
          text: "‎"
        }]
      }
    );
  }

  const modal = {
    type: 'modal',
    callback_id: 'settings_modal_submitted',
    title: {
      type: 'plain_text',
      text: 'Translate Channels',
      emoji: true
    },
    submit: {
      type: 'plain_text',
      text: 'Submit',
      emoji: true
    },
    close: {
      type: 'plain_text',
      text: 'Close',
      emoji: true
    },
    blocks: blocks
  };

  const selectableLanguages = getSelectableLanguages();
  selectableLanguages.unshift({
    text: {
      type: 'plain_text',
      text: '(No translation)',
      emoji: true
    },
    value: 'do_not_translate'
  });

  if (value.lang.length > 0) {
    const preselectedLanguages = value.lang.map(langCode => getModalOption(langCode));
    if (value.id === 'any_channel') {
      modal.blocks[0].element.initial_options = preselectedLanguages;
    } else {
      modal.blocks[1].element.initial_options = preselectedLanguages;
    }
  }

  // Set options for the language selector
  const langBlockIndex = value.id === 'any_channel' ? 0 : 2; // Account for the warning block
  modal.blocks[langBlockIndex].element.options = selectableLanguages;
  
  return modal;
}

export default buildSettingsModal;