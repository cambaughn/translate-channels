import { getSelectableLanguages, getModalOption } from "../util/languages/languageHelpers.js";

const buildSettingsModal = (value) => {
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
    blocks: [
      {
        type: 'input',
        block_id: 'select_channel_block',
        label: {
          type: 'plain_text',
          text: 'Select channels to translate'
        },
        element: {
          type: 'multi_conversations_select',
          action_id: 'select_channel',
          initial_conversations: [],
          filter: { include: ['public']},
          placeholder: {
            type: 'plain_text',
            text: 'Select channels',
            emoji: true
          },
        }
      },
      { type: 'divider' },
      {
        type: 'input',
        block_id: 'select_lang_block',
        label: {
          type: 'plain_text',
          text: 'Add target languages'
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
          options: []
        }
      }
    ]
  };
  const preselectedChannel = (['none', 'any_channel'].includes(value.id)) ? [] : [value.id];
  const selectableLanguages = getSelectableLanguages();
  selectableLanguages.unshift({
    text: {
      type: 'plain_text',
      text: '(No translation)',
      emoji: true
    },
    value: 'do_not_translate'
  });
  if (preselectedChannel.length > 0) {
    modal.blocks[0].element.initial_conversations = preselectedChannel;
  }
  if (value.lang.length > 0) {
    const preselectedLanguages = value.lang.map(langCode => getModalOption(langCode));
    modal.blocks[2].element.initial_options = preselectedLanguages;
  }
  modal.blocks[2].element.options = selectableLanguages;
  return modal;
}

export default buildSettingsModal;