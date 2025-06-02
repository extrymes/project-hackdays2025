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

import $ from '@/jquery'
import _ from '@/underscore'
import Dropdown from '@/io.ox/backbone/mini-views/dropdown'
import * as mailUtil from '@/io.ox/mail/util'
import textproc from '@/io.ox/core/tk/textproc'

import { settings } from '@/io.ox/mail/settings'
import gt from 'gettext'
import openSettings from '@/io.ox/settings/util'

const extensions = {

  options (baton) {
    if (_.device('smartphone')) return

    // TODO: limit is 'de facto' disabled for now
    const dropdown = this.data('view')
    const LIMIT = settings.get('compose/signatureLimit', 100)

    function draw () {
      const collection = baton.config.get('signatures')
      const overflow = collection.length - LIMIT
      dropdown.header(gt('Signatures'))
      dropdown.option('signatureId', '', gt('No signature'))

      collection.each((model, index) => {
        if (index >= LIMIT) return
        dropdown.option('signatureId', model.get('id'), model.get('displayname'))
      })
      if (overflow > 0) {
        // #. %1$s: number of additional signatures in context of a signatures dropdown
        dropdown.link('settings', gt('%1$s more...', overflow), () => openSettings('virtual/settings/io.ox/mail', 'io.ox/mail/settings/signatures'), { icon: true })
      }
      dropdown.link('settings', gt('Edit signatures...'), () => openSettings('virtual/settings/io.ox/mail', 'io.ox/mail/settings/signatures'), { icon: true })
    }

    baton.view.signaturesLoading.done(draw)
  },

  menu (baton) {
    const dropdown = new Dropdown({ model: baton.config })

    function draw (collection) {
      dropdown.prepareReuse()
      dropdown.option('signatureId', '', gt('No signature'))
      dropdown.$ul.addClass('pull-right')

      collection.each(model => {
        dropdown.option('signatureId', model.get('id'), model.get('displayname'))
      })
      dropdown.divider()
      dropdown.link('settings', gt('Manage signatures'), () => openSettings('virtual/settings/io.ox/mail', 'io.ox/mail/settings/signatures'))
      dropdown.$ul.addClass('pull-right')
      dropdown.render()
    }

    baton.view.signaturesLoading.done(function (collection) {
      const refresh = draw.bind(null, collection)
      baton.view.listenTo(collection, 'add remove reset', refresh)
      refresh()
    })
    dropdown.$el.addClass('signatures text-left')
    return dropdown
  }
}

const util = {

  // extract the raw content
  getRaw (signature) {
    const str = $('<div>').html(signature.content).text()
    return util.stripWhitespace(str)
  },

  stripWhitespace (str) {
    return str.replace(/\s+/g, '')
  },

  looksLikeHTML (text) {
    return /(<\/?\w+(\s[^<>]*)?>)/.test(text)
  },

  lookLikePlainTextWithHTML (text) {
    // only plaintext with links
    return /^([^<>]|<\/?a>|<a [^>]+>)*$/.test(text)
  },

  cleanUpWhiteSpace (text) {
    return String(text || '')
    // replace white-space and evil \r
      .replace(/(\r\n|\n|\r)/g, '\n')
    // replace subsequent white-space (except linebreaks)
      .replace(/[\t\f\v ][\t\f\v ]+/g, ' ')
      .trim()
  },

  cleanUp (str, isHTML) {
    // special entities like '&'/&amp;
    const sourceLooksLikeHTML = util.looksLikeHTML(str)
    const $el = $('<div>')[sourceLooksLikeHTML ? 'html' : 'text'](util.cleanUpWhiteSpace(str))
    let html = $el.html()

    if (util.lookLikePlainTextWithHTML(html)) html = '<pre>' + html + '</pre>'
    if (!isHTML && sourceLooksLikeHTML) return textproc.htmltotext(html)
    return html
  }
}

// MODEL: extends mail compose model
const model = {

  // use defaultSignature or reference already used one (edit-case)
  setInitialSignature (model) {
    const signatures = this.get('signatures')
    let signature
    const content = model.get('content')

    // when editing a draft we might have a signature
    if (this.is('edit|copy') || model.restored) {
      // get id of currently drawn signature
      signature = signatures.find(function (model) {
        const raw = util.getRaw(model.toJSON())
        // ignore empty signatures (match empty content)
        if (_.isEmpty(raw)) return
        // HTML: node content matches signature
        if (this.get('editorMode') === 'html') {
          const node = $('<div>').append(content).children('div[class$="io-ox-signature"]:last')
          return util.stripWhitespace(node.text()) === raw
        }
        // TEXT: contains
        return util.stripWhitespace(content).indexOf(raw) > -1
      }.bind(this))

      if (signature) {
        this.set('signatureIsRendered', true)
        this.set('signatureId', signature.id, { silent: false })
      }
    } else {
      // if not editing a draft we add the default signature (if it exists)
      this.set('signatureId', this.getDefaultSignatureId(model))
    }
  },

  // set default signature dependant on mode, there are settings that correspond to this
  getDefaultSignatureId (model) {
    // no differentiation between compose/edit and reply/forward on mobile
    const from = model.get('from') ? model.get('from')[1] : undefined
    const defaultSignature = mailUtil.getDefaultSignatures(this.get('type'))
    if (_.isEmpty(defaultSignature)) return ''
    if (!from) return defaultSignature
    return defaultSignature[from] || ''
  },

  // getter
  getSignatureById (id) {
    id = String(id)
    return this.get('signatures').find(function (model) {
      return model.get('id') === id
    })
  }
}

// VIEW: extends mail compose view
const view = {

  getSignatureContent () {
    const isUnquotedForward = settings.get('forwardunquoted', false) && this.config.is('forward')
    if (isUnquotedForward) return this.editor.find('div[class$="io-ox-signature"]')
    return this.editor.children('div[class$="io-ox-signature"]')
  },

  // handler -> change:signatures
  updateSignatures () {
    const currentSignature = this.config.get('signature')

    if (!currentSignature) return

    // get latest signature object of current signature
    const changedSignature = this.config.getSignatureById(currentSignature.id)
    // has changed?
    if (currentSignature.content !== changedSignature.content) {
      const isHTML = !!this.editor.find
      if (isHTML) {
        // HTML
        this.getSignatureContent().each(function () {
          const node = $(this)
          const text = node.text()
          const changed = util.getRaw(changedSignature) === util.stripWhitespace(text)
          if (changed) node.empty().append($(changedSignature.content))
        })
      } else {
        // TEXT
        const currentContent = util.cleanUp(currentSignature.content, false)
        const changedContent = util.cleanUp(changedSignature.content, false)
        this.editor.replaceParagraph(currentContent, changedContent)
      }

      this.config.set('signature', changedSignature)
    }
  },

  // handler -> change:signatureId
  setSignature (model, id) {
    const signatures = this.config.get('signatures')
    const signature = signatures.findWhere({ id })
    const isEmptySignature = (id === '')
    // invalid signature
    if (!signature && !isEmptySignature) return

    // edit-case: signature already in DOM
    // compose-case: signature not in DOM
    this.config.set('signature', signature ? signature.toJSON() : null, { silent: !!this.config.get('signatureIsRendered') })
    this.config.unset('signatureIsRendered')
  },

  // handler -> change:signature
  redrawSignature (model, signature) {
    const previous = this.config && this.config.previous('signature')
    // remove old signature
    if (previous) this.removeSignature(previous)
    // set new signature
    if (!signature) return
    this.appendSignature(signature)
  },

  removeSignature (signature) {
    // fallback: get signature by id
    signature = typeof signature === 'string' ? this.config.getSignatureById(signature) : signature
    // fallback: get current signature object
    if (!signature) {
      if (!this.config.get('signature')) return
      signature = this.config.get('signature')
    }

    const self = this
    const isHTML = !!this.editor.find
    const currentSignature = util.cleanUp(signature.content, isHTML)

    // remove current signature from editor
    if (isHTML) {
      this.getSignatureContent().each(function () {
        const node = $(this)
        const text = node.text()
        const unchanged = self.config.get('signatures').find(function (model) {
          return util.getRaw(model.toJSON()) === util.stripWhitespace(text)
        })

        // remove entire block unless it seems edited
        if (unchanged) {
          if (unchanged.get('misc').insertion === 'below' && node.prevAll().length > 1 && node.prev()[0].innerHTML === '<br>') node.prev().remove()
          node.remove()
        } else node.removeAttr('class')
      })
    } else if (currentSignature) {
      // matches linebreaks in insertPostCite
      const str = (signature.misc.insertion === 'below') ? '\n\n' + currentSignature : currentSignature + '\n\n'
      this.editor.replaceParagraph(str, '')
    }
  },

  appendSignature (signature) {
    let text
    let proc
    const isHTML = !!this.editor.find
    const isEmpty = !/<img\s[^>]*?src\s*=\s*['"]([^'"]*?)['"][^>]*?>/.test(signature.content || '') && !textproc.htmltotext(signature.content).trim()

    // add signature?
    if (isEmpty || !this.config.get('signatures').length) return

    text = util.cleanUp(signature.content, isHTML)
    if (isHTML) text = this.getParagraph(text, util.looksLikeHTML(text))
    // signature wrapper
    if (signature.misc.insertion === 'below') {
      proc = (this.editor.insertPostCite || this.editor.appendContent).bind(this.editor)
      proc(text)
      this.editor.scrollTop('bottom')
    } else {
      // backward compatibility
      proc = (this.editor.insertPrevCite || this.editor.prependContent).bind(this.editor)
      proc(text)
      this.editor.scrollTop('top')
    }
  }
}

export default {
  extensions,
  util,
  model,
  view
}
