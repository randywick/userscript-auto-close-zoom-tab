// ==UserScript==
// @name          	auto-close-zoom-tab
// @description     Automatically closes Zoom meeting chrome tabs after a given delay.
//
// @author          Randall Wick <randall.wick@airbnb.com>
// @namespace       http://github.com/randywick
// @downloadURL     https://github.com/randywick/userscript-auto-close-zoom-tab/raw/main/auto-close-zoom-tab.user.js
// @version         1.1.1
// @updateURL       https://github.com/randywick/userscript-auto-close-zoom-tab/raw/main/auto-close-zoom-tab.user.js
// @license         GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright       Copyright (C) 2012, by Randall Wick <randall.wick@airbnb.com>
//
// @grant           window.close
// @grant           window.onurlchange
//
// @match           *://*.zoom.us/*
//
// @run-at          document-end
// @unwrap
// ==/UserScript==

/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * SCRIPT DESCRIPTION.
 *
 * @see http://wiki.greasespot.net/API_reference
 * @see http://wiki.greasespot.net/Metadata_Block
 */
 (function() {
  const DEFAULT_TTL = 10
  let isPostAttendeeTab = false
  let shouldAbort = false

  const createCountdownElement = () => {
    const container = document.createElement('div')
    container.classList.add('aczt-container')
    container.style.fontFamily = 'Arial, Helvetica, sans-serif'
    container.style.color = 'white'
    container.style.fontWeight = 900
    container.style.textShadow = '0px 20px 40px rgba(0,0,0,0.2)'
    container.style.position = 'fixed'
    container.style.top = 0
    container.style.right = 0
    container.style.bottom = 0
    container.style.left = 0
    container.style.display = 'flex'
    container.style.flexFlow = 'row nowrap'
    container.style.alignItems = 'center'
    container.style.justifyContent = 'center'
    container.style.opacity = 0
    container.style.transition = 'opacity 1s'
    container.style.zIndex = 10000

    const content = document.createElement('div')
    content.style.display = 'flex'
    content.style.flexFlow = 'column nowrap'
    content.style.alignItems = 'center'
    content.style.justifyContent = 'center'
    content.style.marginTop = '-80%'

    const header = document.createElement('span')
    header.style.fontSize = '20px'
    header.style.webkitTextStroke = '1px black'
    header.textContent = 'Automatically Closing In'

    const timer = document.createElement('span')
    timer.classList.add('aczt-countdown')
    timer.style.fontSize = '150px'
    timer.style.webkitTextStroke = '1px black'

    const footer = document.createElement('span')
    footer.style.fontSize = '12px'
    footer.textContent = 'Press escape or click the mouse to abort'

    content.appendChild(header)
    content.appendChild(timer)
    content.appendChild(footer)
    container.appendChild(content)
    document.body.appendChild(container)

    window.getComputedStyle(container).opacity
    container.style.opacity = 1

    let handleClickEvent
    let handleKeyUpEvent

    const abort = () => {
      document.body.removeChild(container)
      shouldAbort = true
      document.removeEventListener('keyup', handleKeyUpEvent)
      document.removeEventListener('click', handleClickEvent)
    }

    handleClickEvent = () => abort()
    handleKeyUpEvent = (event) => {
      if (/escape/i.test(event.key)) {
        abort()
      }
    }

    document.addEventListener('keyup', handleKeyUpEvent)
    document.addEventListener('click', handleClickEvent)

    return container
  }

  const sleep = async (ms) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), ms)
    })
  }

  const execCountdown = async (container) => {
    let elapsed = 0
    while (elapsed <= DEFAULT_TTL && !shouldAbort) {
      const remaining = DEFAULT_TTL - elapsed
      container.querySelector('span.aczt-countdown').textContent = `${remaining}`

      if (remaining > 0) {
        await sleep(1000)
      }

      elapsed += 1
    }

    if (!shouldAbort) {
      window.open('', '_self', '')
      window.close()
    }
  }

  const main = async () => {
    if (!isPostAttendeeTab) {
      if (/#success/.test(location.hash) === true) {
        isPostAttendeeTab = true
      } else {
        const params = (new URL(document.location)).searchParams
        if (params.has('mn')) {
          isPostAttendeeTab = true
        }
      }

      if (isPostAttendeeTab) {
        const container = createCountdownElement()
        execCountdown(container)
      }
    }
  }

  window.addEventListener('urlchange', () => main())
  main()

})();