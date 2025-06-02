/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

import DOMPurify from 'dompurify'
import $ from '@/jquery'
import _ from '@/underscore'
import ModalDialog from '@/io.ox/backbone/views/modal'
import mailAPI from '@/io.ox/mail/api'
import Editor from '@/io.ox/core/tk/contenteditable-editor'
import inline from '@/io.ox/mail/compose/inline-images'
import ext from '@/io.ox/core/extensions'
import snippetsApi from '@/io.ox/core/api/snippets'
import gt from 'gettext'
import yell from '@/io.ox/core/yell'
import '@/io.ox/core/tk/snippetsUtilStyle.scss'

const strings = {
  signature: {
    edit: gt('Edit signature'),
    create: gt('Add signature'),
    name: gt('Signature name'),
    deleteTitle: gt('Delete signature'),
    // #. %1$s is the name of the email signature
    deleteQuestion (name) { return gt('Do you really want to delete the signature "%1$s"?', name) }
  },
  template: {
    edit: gt('Edit template'),
    create: gt('Add template'),
    name: gt('Template name'),
    deleteTitle: gt('Delete template'),
    // #. %1$s is the name of the mail text template
    deleteQuestion (name) { return gt('Do you really want to delete the template "%1$s"?', name) }
  }
}

ext.point('io.ox/mail/settings/snippet-dialog/edit').extend({
  id: 'name',
  index: 100,
  render () {
    const snippet = this.getSnippet()
    this.$body.append(
      $('<div class="form-group">').append(
        $('<label for="snippet-name" class="sr-only">').text(strings[snippet.type].name),
        $('<input id="snippet-name" type="text" class="form-control" maxlength="80">')
          .attr('placeholder', strings[snippet.type].name)
          .val(snippet.displayname)
          .on('change', this.validateName.bind(this))
      )
    )
    // initial focus
    _.defer(function () {
      this.$('#snippet-name').focus()
    }.bind(this))
  }
})

ext.point('io.ox/mail/settings/snippet-dialog/edit').extend({
  id: 'error',
  index: 200,
  render () {
    this.$body.append(
      $('<div class="help-block error">').attr('id', _.uniqueId('error-help-'))
    )
  }
})

ext.point('io.ox/mail/settings/snippet-dialog/edit').extend({
  id: 'editor',
  index: 300,
  render (baton) {
    const snippet = baton.view.getSnippet()
    const editorId = _.uniqueId('editor-')
    let container
    this.$body.append(
      $('<div class="form-group">').css({
        'min-height': '266px',
        height: '266px'
      }).append(
        container = $('<div class="editor">').attr('data-editor-id', editorId)
      )
    )

    new Editor(container, {
      toolbar1: 'bold italic | alignleft aligncenter alignright | link image',
      advanced: 'fontselect fontsizeselect forecolor | code',
      css: {
        // overwrite min-height of editor
        'min-height': '230px',
        height: '230px',
        'overflow-y': 'auto'
      },
      height: 230,
      plugins: 'autolink oximage oxpaste oxdrop link paste textcolor emoji lists code',
      class: 'io-ox-snippet-edit',
      keepalive: mailAPI.keepalive,
      oxContext: { snippet: true },
      imageLoader: {
        upload (file) {
          return inline.api.inlineImage({ file, editor: baton.view.editor.tinymce() })
        },
        getUrl (response) {
          return inline.api.getInsertedImageUrl(response)
        }
      }
    }).done(function setSnippet (editor) {
      let str = DOMPurify.sanitize(snippet.content)
      editor.show()
      if (snippet.content && !looksLikeHTML(str)) {
        str = $('<p>').append(editor.ln2br(str)).prop('outerHTML')
      }
      editor.setContent(str)
      baton.view.editor = editor
    })
  }
})

ext.point('io.ox/mail/settings/snippet-dialog/save').extend(
  {
    id: 'default',
    index: 100,
    perform (baton) {
      const snippet = this.getSnippet()

      baton.data = {
        id: snippet.id,
        type: snippet.type,
        module: 'io.ox/mail',
        displayname: this.$('#snippet-name').val(),
        misc: snippet.misc
      }
    }
  }, {
    id: 'wait-for-pending-images',
    index: 200,
    perform (baton) {
      // touch devices: support is limited to 'lists', 'autolink', 'autosave'
      const editor = baton.view.editor.tinymce()
      baton.data.content = baton.view.editor.getContent({ format: 'html' })
      if (!editor || !editor.plugins.oximage) return $.when()
      const ids = $('img[data-pending="true"]', editor.getContent()).map(function () {
        return $(this).attr('data-id')
      })
      const deferreds = editor.plugins.oximage.getPendingDeferreds(ids)
      return $.when.apply($, deferreds).then(() => {
        // maybe image references were updated
        baton.data.content = baton.view.editor.getContent({ format: 'html' })
      })
    }
  }, {
    id: 'trailing-whitespace',
    index: 300,
    perform (baton) {
      // remove trailing whitespace when copy/paste snippets out of html pages
      if (baton.data && baton.data.content) baton.data.content = baton.data.content.replace(/(<br>)\s+(\S)/g, '$1$2')
    }
  }, {
    id: 'save',
    index: 1000,
    perform (baton) {
      const isNew = !baton.data.id
      const def = isNew ? snippetsApi.create(baton.data) : snippetsApi.update(baton.data)
      return def.done(() => {
        snippetsApi.getAll({ timeout: 0 }).done(() => {
          // some views need to do updates after saving
          if (baton.options.updateData) baton.options.updateData(isNew)
          baton.view.close()
        })
      }).fail(error => {
        yell(error)
        baton.view.idle()
      })
    }
  }
)

function looksLikeHTML (str) {
  return /(<\/?\w+(\s[^<>]*)?>)/.test(str || '')
}

export default {

  looksLikeHTML,

  sanitize (str) {
    str = $.trim(String(str || ''))
    // remove trailing whitespace of every line
      .replace(/[\s\xA0]+$/g, '')
    // fix very special case
      .replace(/^<pre>([\s\S]+)<\/pre>$/, '$1')

    if (!looksLikeHTML(str)) {
      // plain text
      str = _.escape(str).replace(/\n+/g, '<br>')
    } else {
      str = str
      // remove white-space first (carriage return, line feed, tab)
        .replace(/[\r\n\t]/g, '')
      // replace <br>, <div>, and <p> by line breaks
        .replace(/(<br>|<br><\/div>|<\/div>|<\/p>)/gi, '\n')
      // remove all other tags
        .replace(/<(?:.|\n)*?>/gm, '')
      // now convert line breaks to <br>
        .replace(/\n+/g, '<br>')
    }
    return DOMPurify.sanitize(str)
  },

  editSnippet (options = {}, snippetData) {
    const snippet = {
      id: null,
      name: '',
      type: '',
      ...snippetData,
      // enforce content-type text/html. Causes errors with picture upload otherwise
      misc: { ...snippetData.misc, 'content-type': 'text/html' }
    }

    const mode = snippet.id ? 'edit' : 'create'
    return new ModalDialog({
      width: _.device('smartphone') ? undefined : 640,
      async: true,
      title: strings[snippet.type][mode],
      point: 'io.ox/mail/settings/snippet-dialog/edit'
    }).inject({
      getSnippet () {
        return snippet
      },
      validateName () {
        const field = this.$('#snippet-name')
        const target = this.$('.help-block.error')
        const isValid = $.trim(field.val()) !== ''
        field.toggleClass('error', !isValid)
        if (isValid) {
          field.removeAttr('aria-invalid aria-describedby')
          return target.empty()
        }
        field.attr({ 'aria-invalid': true, 'aria-describedby': target.attr('id') })
        target.text(gt('Please enter a valid name'))
      }
    })
      .build(function () {
        this.$el.addClass('io-ox-snippet-dialog')
      })
      .on('before:open', function () {
        // keep this extendable
        ext.point(`io.ox/mail/settings/${snippet.type}-dialog/edit`).invoke('render', this)
      })
      .addCancelButton()
      .addButton({ action: 'save', label: gt('Save') })
      .on('save', function () {
        // cancel 'save' on validation error
        this.validateName()
        if (this.$('input.error').length) return this.idle().$('input.error').first().focus()
        // invoke extensions as a waterfall
        const baton = new ext.Baton({ view: this, options })
        return ext.point('io.ox/mail/settings/snippet-dialog/save')
          .cascade(this, baton).always(function (response) {
            // response is a integer (success) or is an error object (idle in that case)
            if (this && this.idle && _.isObject(response)) this.idle()
          }.bind(this))
      })
      .on('close', function () { if (this.editor) this.editor.destroy() })
      .open()
  },

  showDeleteDialog (snippet) {
    return new Promise(function (resolve, reject) {
      new ModalDialog({ title: strings[snippet.type].deleteTitle, description: strings[snippet.type].deleteQuestion(snippet.displayname) })
        .addCancelButton()
        .addButton({ label: gt('Delete'), action: 'delete' })
        .on('cancel', reject)
        .on('delete', () => snippetsApi.destroy(snippet.id)
          .done(resolve)
          .fail(error => {
            reject(error)
            yell(error)
          }))
        .open()
    })
  }
}
