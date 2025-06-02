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

import { describe, it } from '@jest/globals'
import { expect } from 'chai/index.mjs'

import content from '@/io.ox/mail/detail/content'
import { settings } from '@/io.ox/mail/settings'

describe('Mail content processing', function () {
  describe('Text to HTML', function () {
    function process (str) {
      return content.text2html(str)
    }

    // LINE BREAKS

    it('does not change plain text', function () {
      const html = process('Lorem ipsum')
      expect(html).to.equal('<div>Lorem ipsum</div>')
    })

    it('transforms new lines', function () {
      const html = process('Lorem ipsum\ndolor sit amet')
      expect(html).to.equal('<div>Lorem ipsum</div><div>dolor sit amet</div>')
    })

    it('transforms trailing new lines', function () {
      const html = process('Lorem ipsum\ndolor\nsit\n')
      expect(html).to.equal('<div>Lorem ipsum</div><div>dolor</div><div>sit</div>')
    })

    it('transforms a single new line', function () {
      const html = process('\n')
      expect(html).to.equal('<div><br></div>')
    })

    // LINKS & ADDRESSES

    it('transforms links', function () {
      const html = process('Lorem http://ip.sum! dolor')
      expect(html).to.equal('<div>Lorem <a href="http://ip.sum" rel="noopener" target="_blank">http://ip.sum</a>! dolor</div>')
    })

    it('transforms links inside parentheses', function () {
      const html = process('Lorem (http://ip.sum) dolor')
      expect(html).to.equal('<div>Lorem (<a href="http://ip.sum" rel="noopener" target="_blank">http://ip.sum</a>) dolor</div>')
    })

    it('transforms links inside angle brackets', function () {
      const html = process('Lorem <http://ip.sum> dolor')
      expect(html).to.equal('<div>Lorem &lt;<a href="http://ip.sum" rel="noopener" target="_blank">http://ip.sum</a>> dolor</div>')
    })

    it('transforms mail addresses', function () {
      const html = process('Lorem <ipsum@dolor.amet>')
      expect(html).to.equal('<div>Lorem &lt;<a href="mailto:ipsum@dolor.amet">ipsum@dolor.amet</a>></div>')
    })

    it('transforms multiple mail addresses', function () {
      const html = process('One "ipsum@dolor.amet" and another "ipsum@dolor.amet".')
      expect(html).to.equal('<div>One "<a href="mailto:ipsum@dolor.amet">ipsum@dolor.amet</a>" and another "<a href="mailto:ipsum@dolor.amet">ipsum@dolor.amet</a>".</div>')
    })

    it('ignores invalid addresses', function () {
      const html = process('One "ipsum@dolor" and another "@dolor.amet".')
      expect(html).to.equal('<div>One "ipsum@dolor" and another "@dolor.amet".</div>')
    })

    // // QUOTES

    it('transforms quotes', function () {
      const html = process('> Lorem ipsum')
      expect(html).to.equal('<blockquote type="cite"><div>Lorem ipsum</div></blockquote>')
    })

    it('transforms quotes across multiple lines', function () {
      const html = process('\n> Lorem ipsum\n> dolor sit')
      expect(html).to.equal('<div><br></div><blockquote type="cite"><div>Lorem ipsum</div><div>dolor sit</div></blockquote>')
    })

    it('transforms nested quotes', function () {
      const html = process('\n> Lorem ipsum\n> > dolor sit\n> amet')
      expect(html).to.equal('<div><br></div><blockquote type="cite"><div>Lorem ipsum</div><blockquote type="cite"><div>dolor sit</div></blockquote><div>amet</div></blockquote>')
    })

    it('transforms nested quotes (2/1/2)', function () {
      const html = process('> > Lorem ipsum\n> dolor sit\n> > amet')
      expect(html).to.equal('<blockquote type="cite"><blockquote type="cite"><div>Lorem ipsum</div></blockquote><div>dolor sit</div><blockquote type="cite"><div>amet</div></blockquote></blockquote>')
    })

    it('transforms nested quotes with consecutive brackets', function () {
      const html = process('>> Lorem\n>> ipsum')
      expect(html).to.equal('<blockquote type="cite"><blockquote type="cite"><div>Lorem</div><div>ipsum</div></blockquote></blockquote>')
    })

    it('transforms quotes without trailing new line', function () {
      const html = process('> Lorem\n>\n> ipsum\n>\n\n')
      expect(html).to.equal('<blockquote type="cite"><div>Lorem</div><div><br></div><div>ipsum</div><div><br></div></blockquote><div><br></div>')
    })

    it('transforms nested quotes without trailing new line', function () {
      const html = process('> > Lorem ipsum\n> amet\ndolor sit')
      expect(html).to.equal('<blockquote type="cite"><blockquote type="cite"><div>Lorem ipsum</div></blockquote><div>amet</div></blockquote><div>dolor sit</div>')
    })
  })

  describe('Link Processor', function () {
    const cases = {
      local: '<a href="#some-anchor">',
      common: '<a href="www.ox.io" target="_blank">',
      ftp: '<a href="ftp://ox.io" target="_blank">',
      mailto: '<a href="mailto:john.doe@open-xchange.com" target="_blank">',
      styled: '<a href="http://ox.io" style = "color: #333; text-decoration: underline">',
      different: "<a style='text-decoration:   underline;background-color:#333;color:#333' href='http://ox.io'>"
    }

    it('sets proper protocol and target', function () {
      const baton = { source: cases.common }
      content.extensions.linkTarget(baton)
      expect(baton.source)
        .to.match(/href="http:\/\/www\.ox\.io"/g)
        .to.match(/target="_blank"/g)
    })

    it('should respect other protocols', function () {
      [cases.local, cases.ftp, cases.mailto].forEach(function (source) {
        const baton = { source }
        content.extensions.linkTarget(baton)
        expect(baton.source).to.not.match(/http/)
      })
    })

    it('sets proper disabled state', function () {
      for (const source of Object.values(cases)) {
        expect(content.extensions.linkDisable(source)).to.match(/\sdisabled="disabled" aria-disabled="true"/g)
      }
    })

    it('removes the hypertext reference', function () {
      for (const source of Object.values(cases)) {
        expect(content.extensions.linkRemoveRef(source)).to.match(/href[\s]*=[\s]*["']#["']/g)
      }
    })

    it('removes related inline style properties', function () {
      for (const source in Object.values(cases)) {
        expect(content.extensions.linkRemoveStyle(source))
          .to.not.match(/text-decoration/g)
          .to.not.match(/[^-]color/g)
      }
    })
  })

  describe('Image Processor', function () {
    it('ensures ox.apiRoot is used', function () {
      const baton = { source: '<img src="/ajax">' }
      content.extensions.images(baton)
      expect(baton.source).to.equal('<img src="/api">')
    })
  })

  function process (str, type) {
    return content.get({
      headers: {},
      attachments: [{ content: str, content_type: type || 'text/html', disp: 'inline' }]
    })
  }

  it('should detect empty email', function () {
    const result = process('')
    expect(result.content.innerHTML).to.equal('<div class="no-content">This mail has no content</div>')
  })

  it('should process basic html', function () {
    const result = process('<p>Hello World</p>')
    expect(result.content.innerHTML).to.equal('<p>Hello World</p>')
  })

  it('should process plain text', function () {
    const result = process('\r\rHello World ', 'text/plain')
    expect(result.content.innerHTML).to.equal('<div>Hello World</div>')
  })

  it('should set proper class for plain text mails', function () {
    const result = process('Test', 'text/plain')
    expect(/plain-text/.test(result.content.className)).to.be.true
  })

  it('should set proper class for fixed width fonts', function () {
    settings.set('useFixedWidthFont', true)
    const result = process('Test', 'text/plain')
    expect(/fixed-width-font/.test(result.content.className)).to.be.true
  })

  it('should remove leading white-space', function () {
    const result = process(' \n \n  \ntext', 'text/plain')
    expect(result.content.innerHTML).to.equal('<div>text</div>')
  })

  it('should reduce long \n sequences', function () {
    const result = process('text\n\n\n\ntext\n\n', 'text/plain')
    expect(result.content.innerHTML).to.equal('<div>text</div><div><br></div><div><br></div><div>text</div>')
  })

  describe('mail addresses', function () {
    it('should detect email addresses (text/plain)', function () {
      const result = process('test\njohn.doe@open-xchange.com\ntest', 'text/plain')
      expect(result.content.innerHTML).to.equal('<div>test</div><div><a href="mailto:john.doe@open-xchange.com" class="mailto-link" target="_blank">john.doe@open-xchange.com</a></div><div>test</div>')
    })

    it('should detect email addresses (text/html; @)', function () {
      const result = process('<p><a href="mailto:john.doe@open-xchange.com">john.doe@open-xchange.com</a></p>')
      expect(result.content.innerHTML).to.equal('<p><a href="mailto:john.doe@open-xchange.com" class="mailto-link" target="_blank">john.doe@open-xchange.com</a></p>')
    })

    it('should detect email addresses (text/html; &#64;)', function () {
      // https://bugs.open-xchange.com/show_bug.cgi?id=29892
      const result = process('<p><a href="mailto:john.doe&#64;open-xchange.com">John Doe</a></p>')
      expect(result.content.innerHTML).to.equal('<p><a href="mailto:john.doe@open-xchange.com" class="mailto-link" target="_blank">John Doe</a></p>')
    })
  })

  describe('folders', function () {
    it('should detect folder links (html, old-school)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/?foo#m=infostore&f=1234">http://test/appsuite/?foo#m=infostore&f=1234</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/?foo#m=infostore&amp;f=1234" target="_blank" class="deep-link deep-link-files" role="button">Folder</a>.</p>')
    })

    it('should detect folder links (html)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&folder=1337">http://test/appsuite/#app=io.ox/files&folder=1337</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&amp;folder=1337" target="_blank" class="deep-link deep-link-files" role="button">Folder</a>.</p>')
    })

    it('should detect folder links (html, variant)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&perspective=fluid:icon&folder=1337">http://test/appsuite/#app=io.ox/files&perspective=fluid:icon&folder=1337</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&amp;perspective=fluid:icon&amp;folder=1337" target="_blank" class="deep-link deep-link-files" role="button">Folder</a>.</p>')
    })
  })

  describe('files', function () {
    it('should detect file links (html, old-school)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/?foo#m=infostore&f=1234&i=0">http://test/appsuite/?foo#m=infostore&f=1234&i=0</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/?foo#m=infostore&amp;f=1234&amp;i=0" target="_blank" class="deep-link deep-link-files" role="button">File</a>.</p>')
    })

    it('should detect file links (html)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&folder=1337&id=0">http://test/appsuite/#app=io.ox/files&folder=1337&id=0</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&amp;folder=1337&amp;id=0" target="_blank" class="deep-link deep-link-files" role="button">File</a>.</p>')
    })

    it('should detect file links (html, variant)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&perspective=fluid:icon&folder=1337&id=0">http://test/appsuite/#app=io.ox/files&perspective=fluid:icon&folder=1337&id=0</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/files&amp;perspective=fluid:icon&amp;folder=1337&amp;id=0" target="_blank" class="deep-link deep-link-files" role="button">File</a>.</p>')
    })

    it('should detect external file links (html)', function () {
      const result = process('<p>Link: <a href="http://foobar/appsuite/#app=io.ox/files&folder=1337&id=0">http://foobar/appsuite/#app=io.ox/files&folder=1337&id=0</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://foobar/appsuite/#app=io.ox/files&amp;folder=1337&amp;id=0" target="_blank" class="deep-link" role="button" rel="noopener">File</a>.</p>')
    })
  })

  describe('appointments', function () {
    it('should detect appointment links (html, old-school)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/?foo#m=calendar&i=0&f=1234">http://test/appsuite/?foo#m=calendar&i=0&f=1234</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/?foo#m=calendar&amp;i=0&amp;f=1234" target="_blank" class="deep-link deep-link-calendar" role="button">Appointment</a>.</p>')
    })

    it('should detect appointment links (html)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/calendar&folder=1337&id=0">http://test/appsuite/#app=io.ox/calendar&folder=1337&id=0</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/calendar&amp;folder=1337&amp;id=0" target="_blank" class="deep-link deep-link-calendar" role="button">Appointment</a>.</p>')
    })
  })

  describe('tasks', function () {
    it('should detect task links (html, old-school)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/?foo#m=tasks&i=0&f=1234">http://test/appsuite/?foo#m=tasks&i=0&f=1234</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/?foo#m=tasks&amp;i=0&amp;f=1234" target="_blank" class="deep-link deep-link-tasks" role="button">Task</a>.</p>')
    })

    it('should detect task links (html)', function () {
      const result = process('<p>Link: <a href="http://test/appsuite/#app=io.ox/tasks&id=1337.0&folder=1337">http://test/appsuite/#app=io.ox/tasks&id=1337.0&folder=1337</a>.</p>')
      expect(result.content.innerHTML).to.equal('<p>Link: <a href="http://test/appsuite/#app=io.ox/tasks&amp;id=1337.0&amp;folder=1337" target="_blank" class="deep-link deep-link-tasks" role="button">Task</a>.</p>')
    })
  })
})
