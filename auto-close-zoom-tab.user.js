// ==UserScript==
// @name          	auto-close-zoom-tab
// @description     Automatically closes Zoom meeting chrome tabs after a given delay.
// @version         1.1.4
//
// @author          Randall Wick <randall.wick@airbnb.com>
// @namespace       https://github.com/randywick
// @downloadURL     https://github.com/randywick/userscript-auto-close-zoom-tab/raw/main/auto-close-zoom-tab.user.js
// @updateURL       https://github.com/randywick/userscript-auto-close-zoom-tab/raw/main/auto-close-zoom-tab.user.js
// @license         GPLv3 - http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright       Copyright (C) 2012, by Randall Wick <randall.wick@airbnb.com>
//
// @grant           none
//
// @match           *://*.zoom.us/*
// @match           *://*.zoom.us/j/*
// @match           *://zoom.us/*
// @match           *://zoom.us/j/*
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
  let running = false
  let isPostAttendeeTab = false
  let shouldAbort = false
  let container

  const handleKeyUpEvent = (event) => {
    if (/escape/i.test(event.key)) {
      shouldAbort = true
    }
  }

  const sleep = async (ms) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), ms)
    })
  }

  const createCountdownElement = async () => {
    const container = document.createElement('div')
    container.classList.add('aczt-container')
    container.style.fontFamily = 'Arial, Helvetica, sans-serif'
    container.style.color = 'white'
    container.style.fontWeight = 900
    container.style.textShadow = '0px 20px 40px rgba(0,0,0,0.2)'
    container.style.position = 'fixed'
    container.style.top = '100px'
    container.style.right = 0
    container.style.left = 0
    container.style.display = 'flex'
    container.style.flexFlow = 'row nowrap'
    container.style.alignItems = 'center'
    container.style.justifyContent = 'center'
    container.style.opacity = 0
    container.style.transition = 'opacity 400ms'
    container.style.zIndex = 10000

    const content = document.createElement('div')
    content.classList.add('aczt-content')
    content.style.display = 'flex'
    content.style.flexFlow = 'column nowrap'
    content.style.alignItems = 'center'
    content.style.justifyContent = 'center'
    content.style.border = '1px solid black'
    content.style.padding = '20px'
    content.style.backgroundColor = '#34282C'
    content.style.transition = 'transform 1s, opacity 1s'

    const header = document.createElement('span')
    header.style.fontSize = '20px'
    header.style.webkitTextStroke = '1px black'
    header.textContent = 'Automatically Closing In'

    const timer = document.createElement('span')
    timer.classList.add('aczt-countdown')
    timer.style.fontSize = '150px'
    timer.style.webkitTextStroke = '1px black'

    const footer = document.createElement('span')
    footer.classList.add('aczt-footer')
    footer.style.fontSize = '14px'
    footer.textContent = 'Press escape to abort'

    content.append(header, timer, footer)
    container.append(content)
    document.body.append(container)

    window.getComputedStyle(container).opacity
    container.style.opacity = 1

    return container
  }

  const execCountdown = async () => {
    const content = container.querySelector('div.aczt-content')
    const timer = container.querySelector('span.aczt-countdown')
    const footer = container.querySelector('span.aczt-footer')
    let elapsed = 0
    while (elapsed <= DEFAULT_TTL && !shouldAbort) {
      const remaining = DEFAULT_TTL - elapsed
      timer.textContent = `${remaining}`

      if (remaining > 0) {
        await sleep(1000)
      }

      elapsed += 1
    }

    if (!shouldAbort) {
      await sleep(400)
      content.style.transform = 'rotate(5deg) translate(-20px, 40px)'
      content.style.opacity = '0.3'
      footer.textContent = 'I don\'t want to go!'
      await sleep(300)
      window.close()
    }
  }

  const abortLoop = async () => {
    while (!shouldAbort) {
      await sleep(100)

      if (shouldAbort) {
        if (container) {
          container.style.opacity = 0
          await sleep(1000)
          document.body.removeChild(container)
        }
      }
    }
  }

  const main = async () => {
    if (!running) {
      running = true
      document.addEventListener('keyup', handleKeyUpEvent)
      abortLoop()

      await sleep(5000)

      if (!isPostAttendeeTab && !shouldAbort) {
        if (/#success/.test(location.hash) === true) {
          isPostAttendeeTab = true
        } else if ((new URL(location)).searchParams.has('mn')) {
          isPostAttendeeTab = true
        } else if (/^\/j\/\d{8,}$/.test(location.pathname)) {
          isPostAttendeeTab = true
        }

        if (isPostAttendeeTab) {
          container = await createCountdownElement()
          await execCountdown()
        }
      }

      document.removeEventListener('keyup', handleKeyUpEvent)

      running = false
    }
  }

  window.addEventListener('urlchange', () => main())
  main()
})();
