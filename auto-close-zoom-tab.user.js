// ==UserScript==
// @name          	auto-close-zoom-tab
// @description     Automatically closes Zoom's "Post-attendee" tabs left after joining a meeting.  Should work with both Zoom-branded and vanity URLs.
// @version         1.1.5
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
// @match           *://zoom.us/*
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
 * Automatically closes Zoom's "Post-attendee" tabs left after joining a meeting.  Should work with both Zoom-branded and vanity URLs.
 *
 * @see http://wiki.greasespot.net/API_reference
 * @see http://wiki.greasespot.net/Metadata_Block
 */
 (function() {
  'use strict'

  const DEFAULT_DELAY = 5
  const DEFAULT_TTL = 10

  // Basic script state
  let running = false
  let isPostAttendeeTab = false
  let shouldAbort = false
  let container
  let content
  let timer

  // If any of these tests passes, the script assumes the page is a post-attendee page.
  const locationTests = [
    ({ hash }) => /#success/.test(hash),
    (location) => (new URL(location)).searchParams.has('mn'),
    ({ pathname }) => /^\/[a-z]\/\d{8,}$/i.test(pathname),
  ]

  // Event handler responsible for detecting abort intent
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

  /**
   * Creates and styles the countdown timer HTML elements
   */
  const createHtmlElements = () => {
    container = document.createElement('div')
    container.classList.add('aczt-container')
    Object.assign(container.style, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: 'white',
      fontWeight: 900,
      textShadow: '0px 20px 40px rgba(0,0,0,0.2)',
      position: 'fixed',
      top: '100px',
      right: 0,
      left: 0,
      display: 'flex',
      flexFlow: 'row nowrap',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0,
      transition: 'opacity 400ms',
      zIndex: 10000,
    })

    content = document.createElement('div')
    content.classList.add('aczt-content')
    Object.assign(content.style, {
      display: 'flex',
      flexFlow: 'column nowrap',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid black',
      padding: '20px',
      backgroundColor: '#34282C',
      transition: 'transform 1s, opacity 1s',
    })

    const header = document.createElement('span')
    Object.assign(header.style, {
      fontSize: '20px',
      webkitTextStroke: '1px black',
    })
    header.textContent = 'Automatically Closing In'

    timer = document.createElement('span')
    timer.classList.add('aczt-timer')
    Object.assign(timer.style, {
      fontSize: '150px',
      webkitTextStroke: '1px black',
    })

    const footer = document.createElement('span')
    footer.classList.add('aczt-footer')
    Object.assign(footer.style, {
      fontSize: '14px',
    })
    footer.textContent = 'Press escape to abort'

    content.append(header, timer, footer)
    container.append(content)
    document.body.append(container)

    // Event loop tomfoolery in order to respect the transition style
    window.getComputedStyle(container).opacity
    container.style.opacity = 1
  }

  /**
   * Triggers terminal view and attempts to close the tab.
   */
  const closeTab = async () => {
    await sleep(400)
    content.style.transform = 'rotate(5deg) translate(-20px, 40px)'
    content.style.opacity = '0.3'
    footer.textContent = 'I don\'t want to go!'
    await sleep(300)
    window.close()
  }

  /**
   * If the view is connected, it fades it, allows page interaction, and finally
   * removes the HTML from the DOM.
   */
  const abort = async () => {
    if (container?.isConnected) {
      Object.assign(container.style, {
        opacity: 0,
        PointerEvents: 'none',
      })

      await sleep(1000)
      container.remove()
    }
  }

  /**
   * Counts down to zero, updating the view each second.  If the countdown is not aborted and reaches zero, triggers the close tab function.
   */
  const runTimer = async () => {
    let secondsElapsed = 0

    while (secondsElapsed <= DEFAULT_TTL && !shouldAbort) {
      const remaining = DEFAULT_TTL - secondsElapsed
      timer.textContent = `${remaining}`

      if (remaining > 0) {
        await sleep(1000)
      }

      secondsElapsed += 1
    }

    if (!shouldAbort) {
      await closeTab()
    }
  }

  /**
   * Loop to check for abort intent.  This is done in a separate loop from the
   * timer in order to respond to the escape keypress more quickly.
   */
  const checkAbortLoop = async () => {
    while (!shouldAbort) {
      await sleep(100)
      if (shouldAbort) {
        abort()
      }
    }
  }

  /**
   * Main logic, triggered either upon page load or redirect.  Executes once
   * per trigger.  Safe to trigger multiple times.
   */
  const main = async () => {
    if (!running) {
      running = true
      checkAbortLoop()
      document.addEventListener('keyup', handleKeyUpEvent)

      await sleep(DEFAULT_DELAY * 1000)

      if (
        !isPostAttendeeTab // On redirect or url change, if not matched previously
        && !shouldAbort // ...and not aborted
        && locationTests.some((test) => test(location)) // ...and matches at least one pattern
      ) {
        isPostAttendeeTab = true
        await createHtmlElements()
        await runTimer()
      }

      document.removeEventListener('keyup', handleKeyUpEvent)
      running = false
    }
  }

  window.addEventListener('urlchange', main)
  main()
})();
