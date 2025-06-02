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

import { describe, it, expect } from '@jest/globals'

import textproc from '@/io.ox/core/tk/textproc'

describe('Text processing toolkit', function () {
  describe('htmltotext', function () {
    describe('should handle links', function () {
      it('should convert links', function () {
        const text = textproc.htmltotext('<a href="https://example.com/">Example link</a>')
        expect(text).toEqual('Example link (https://example.com/)')
      })
      it('should use short format for links without "description"', function () {
        const text = textproc.htmltotext('<a href="https://example.com/">https://example.com/</a>')
        expect(text).toEqual('https://example.com/')
      })
      it('should use short format for mailto links', function () {
        const text = textproc.htmltotext('<a href="mailto:jochen@example.com">jochen@example.com</a>')
        expect(text).toEqual('jochen@example.com')
      })
      it('with surrounding text', function () {
        const text = textproc.htmltotext('<a href="http://example.org">Go to example.org</a><br><a href="http://example.org/foo">Foo</a>')
        expect(text).toEqual('Go to example.org (http://example.org)\nFoo (http://example.org/foo)')
      })
    })

    it('should preserve <> characters', function () {
      const text = textproc.htmltotext('&lt;noTag&gt; should be preserved')
      expect(text).toEqual('<noTag> should be preserved')
    })

    it('should add newline characters for paragraph elements', function () {
      const text = textproc.htmltotext('Text<p>new paragraph text</p>')
      expect(text).toEqual('Text\nnew paragraph text')
    })

    it('should drop <html>, <head>, <title>, and <body> tags', function () {
      const text = textproc.htmltotext('<html><head><title>Test</title></head><body>Lorem ipsum</body></html>')
      expect(text).toEqual('Lorem ipsum')
    })

    it('should add line breaks for <br> elements', function () {
      const text = textproc.htmltotext('<br>Text<br />next line<br>text<br><br>')
      expect(text).toEqual('\nText\nnext line\ntext\n')
    })

    it('should add one line break for an empty <div>', function () {
      const text = textproc.htmltotext('Lorem<div></div>ipsum')
      expect(text).toEqual('Lorem\nipsum')
    })

    it('should add double line breaks for <div><br></div>', function () {
      const text = textproc.htmltotext('Lorem<div><br></div>ipsum')
      expect(text).toEqual('Lorem\n\nipsum')
    })

    it('should add line breaks for block elements', function () {
      const text = textproc.htmltotext('Line 1<div>Line 2</div><div>Line 3</div>Line 4<div>Line 5<div>Line 6</div></div>')
      expect(text).toEqual('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6')
    })

    it('should add > for blockquotes', function () {
      const text = textproc.htmltotext('<blockquote>Level 1<blockquote>Level 2<blockquote>Level 3</blockquote></blockquote>Level 1</blockquote>')
      expect(text).toEqual('> Level 1\n> > Level 2\n> > > Level 3\n> Level 1')
    })

    it('should add > for blockquotes with empty lines', function () {
      const text = textproc.htmltotext('<blockquote>Line 1<br><br>Line 4</blockquote>')
      expect(text).toEqual('> Line 1\n> \n> Line 4')
    })

    it('should not keep whitespaces (newline, tabs, multiple space) in textnodes', function () {
      const text = textproc.htmltotext('<blockquote type="cite"><div>Test\n   </div>\n\t\t</blockquote>')
      expect(text).toEqual('> Test')
    })

    it('should keep whitespaces in pre tag', function () {
      const text = textproc.htmltotext('<pre>\n\nSecond line\n\tTabbed third line\n   Multiple spaces</pre>')
      expect(text).toEqual('\nSecond line\n\tTabbed third line\n   Multiple spaces')
    })

    it('should transform unordered lists', function () {
      const text = textproc.htmltotext('First line<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>Last line')
      expect(text).toEqual('First line\n  * Item 1\n  * Item 2\n  * Item 3\nLast line')
    })

    it('should transform ordered lists', function () {
      const text = textproc.htmltotext('First line<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>Last line')
      expect(text).toEqual('First line\n  1. Item 1\n  2. Item 2\n  3. Item 3\nLast line')
    })

    it('should transform ordered lists with start attribute', function () {
      const text = textproc.htmltotext('First line<ol start="3"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>Last line')
      expect(text).toEqual('First line\n  3. Item 1\n  4. Item 2\n  5. Item 3\nLast line')
    })

    it('should transform nested lists', function () {
      const text = textproc.htmltotext('First line<ul><li>Item 1</li><li>Item 2<ul><li>Item 2.1</li><li>Item 2.2</li></ul></li><li>Item 3</li></ul>Last line')
      expect(text).toEqual('First line\n  * Item 1\n  * Item 2\n    * Item 2.1\n    * Item 2.2\n  * Item 3\nLast line')
    })

    it('should transform lists with <br>', function () {
      const text = textproc.htmltotext('First line<ul><li>Item 1<br>Second line</li><li>Item 2</li></ul>Last line')
      expect(text).toEqual('First line\n  * Item 1\n    Second line\n  * Item 2\nLast line')
    })

    it('should transform <hr>', function () {
      const text = textproc.htmltotext('First line<hr>Last line')
      expect(text).toEqual('First line\n------------------------------\nLast line')
    })

    it('should transform <pre>', function () {
      const text = textproc.htmltotext('First line<pre>Lorem\nipsum\tdolor\n  sit    amet</pre>Last line')
      expect(text).toEqual('First line\nLorem\nipsum\tdolor\n  sit    amet\nLast line')
    })

    it('should transform <input type="text">', function () {
      const text = textproc.htmltotext('First line<br><input type="text" value="lorem ipsum"><br>Last line')
      expect(text).toEqual('First line\n[lorem ipsum]\nLast line')
    })

    it('should transform <input type="checkbox">', function () {
      const text = textproc.htmltotext('<input type="checkbox" checked><br><input type="checkbox">')
      expect(text).toEqual('[X]\n[ ]')
    })

    it('should drop comments', function () {
      const text = textproc.htmltotext('Lorem <!-- a comment -->ipsum')
      expect(text).toEqual('Lorem ipsum')
    })

    it('should transform <table>', function () {
      const text = textproc.htmltotext(
        '<table><tbody>' +
          '<tr><td>Cell 1.1</td><td>Cell 1.2</td><td>Cell 1.3</td></tr>' +
          '<tr><td>Cell 2.1</td><td>Cell 2.2</td><td>Cell 2.3</td></tr>' +
        '</tbody></table>'
      )
      expect(text).toEqual(
        'Cell 1.1\tCell 1.2\tCell 1.3\t\n' +
        'Cell 2.1\tCell 2.2\tCell 2.3\t'
      )
    })

    it('should transform a complex example', function () {
      const text = textproc.htmltotext(
        '<html><head><title>Test</title><style>body { color: red }</style><script>alert(911)</script></head><body>' +
        '<!-- a comment -->' +
        '<p><a href="http://example.org/example">Read this online</a></p>' +
        '<h1>Lorem ipsum</h1>' +
        '<table><tr><td><p>Lorem ipsum dolor sit amet</p></td><td><p>consectetur adipiscing elit</p></td></tr></table>' +
        '<div><br></div>' +
        '<p>eiusmod tempor incididunt ut labore et dolore magna aliqua erat</p>' +
        '<p><input type="text" value="lorem ipsum"></p>' +
        '<p><input type="checkbox" checked> dolor sit amet</p>' +
        '<style>body { color: red }</style>' +
        '<script>alert(911)</script>' +
        '</body></html>'
      )
      expect(text).toEqual(
        'Read this online (http://example.org/example)\n' +
        '\nLorem ipsum\n' +
        'Lorem ipsum dolor sit amet\tconsectetur adipiscing elit\t\n' +
        '\n' +
        'eiusmod tempor incididunt ut labore et dolore magna aliqua erat\n' +
        '[lorem ipsum]\n' +
        '[X] dolor sit amet'
      )
    })

    it('should keep leading empty lines', function () {
      const text = textproc.htmltotext('<div></br></div><div>Content</div>')
      expect(text).toEqual('\nContent')
    })
  })
})
