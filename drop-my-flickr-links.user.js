// ==UserScript==
// @name        Drop My Flickr Links!
// @namespace   https://github.com/stanleyqubit/drop-my-flickr-links
// @license     MIT License
// @author      stanleyqubit
// @compatible  firefox Tampermonkey with UserScripts API Dynamic
// @compatible  chrome Violentmonkey or Tampermonkey
// @match       *://*.flickr.com/*
// @connect     www.flickr.com
// @run-at      document-start
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_download
// @grant       GM_openInTab
// @grant       GM_notification
// @grant       GM.xmlHttpRequest
// @grant       GM_registerMenuCommand
// @version     2.0
// @icon        https://www.google.com/s2/favicons?sz=64&domain=flickr.com
// @description Creates a hoverable dropdown menu that shows links to all available sizes for Flickr photos.
// ==/UserScript==


/* The photos available for download through this userscript may be protected by
 * copyright laws. Downloading a photo constitutes your agreement to use the photo
 * in accordance with the license associated with it. Please check the individual
 * photo's license information before use.
 *
 * Note -- Firefox + Tampermonkey users: in order for the script to have full
 * access to the Flickr YUI `appContext` global variable and thus avoid having to
 * resort to workarounds which may result in incorrectly displayed links or
 * incomplete photo data, go to the Tampermonkey dashboard -> Settings, under
 * "Config mode" select "Advanced", then under "Content Script API" select
 * "UserScripts API Dynamic", then click "Save".
 *
 * FYI -- some authors may choose to disable photo downloads which means that
 * Flickr will not make certain photo sizes (e.g. originals) available for users
 * that aren't signed in with a Flickr account. */


console.log("Loaded.");
const SCRIPT_NAME = "Drop My Flickr Links!";
const BUTTON_TEXT = 'D';


const defaultSettings = {
  IMMEDIATE: {
    type: "boolean",
    value: true,
    name: 'Immediate',
    desc: 'On: get sizes for all photos as soon as they appear inside a page. ' +
          'Off: only get sizes on button hover.',
  },
  MAIN_PHOTO_ENGAGEMENT_VIEW: {
    type: "boolean",
    value: true,
    name: 'Main photo page engagement view',
    desc: 'Place the dropdown inside the engagement view when navigating the ' +
          'main photo page.',
  },
  REPLACE_FLICKR_DL_BUTTON: {
    type: "boolean",
    value: false,
    name: 'Replace Flickr download button',
    desc: 'Replace the Flickr download button shown in the main photo page ' +
          'with our button. Requires "Main photo page engagement view".',
  },
  PREPEND_AUTHOR_ID: {
    type: "boolean",
    value: true,
    name: 'Prepend author ID to downloaded image file name',
    desc: 'Self-explanatory.',
  },
  SHOW_LICENSE_INFO: {
    type: "boolean",
    value: true,
    name: 'Show license information',
    desc: 'Shows a hyperlink to the photo\'s license when in preview mode.',
  },

  PREVIEW_MODE_SHOW_CONTROLS: {
    type: "boolean",
    value: true,
    name: 'Show preview controls',
    desc: 'Adds a widget for image control when in preview mode.',
  },
  PREVIEW_MODE_SHOW_CLOSE_BUTTON: {
    type: "boolean",
    value: true,
    name: 'Show preview mode close button',
    desc: 'Adds a clickable close button to the top right corner when in preview mode.',
  },

  PREVIEW_MODE_SCROLL_TO_ZOOM: {
    type: "boolean",
    value: true,
    name: 'Preview mode zoom on mouse scroll',
    desc: 'Zoom the preview image with the mouse wheel.',
  },
  PREVIEW_MODE_EXIT_ON_MOUSE_EVENT: {
    type: "select",
    value: 'dblclick',
    name: 'Preview mode exit on mouse event',
    desc: 'Exits preview mode on this mouse event.',
    opts: {'dblclick': "Double click", 'click': "Click", '': "None"},
  },
  PREVIEW_MODE_EXIT_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 27, key: "Escape", modifierKeys: []},
    name: 'Preview mode exit on key',
    desc: 'Exits preview mode when this key is pressed.',
  },
  PREVIEW_MODE_ROTATE_CW_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 190, key: ">", modifierKeys: ["shiftKey"]},
    name: 'Preview mode rotate clockwise key',
    desc: 'Rotates the preview image 90 degrees clockwise when this key is pressed.',
  },
  PREVIEW_MODE_ROTATE_CCW_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 188, key: "<", modifierKeys: ["shiftKey"]},
    name: 'Preview mode rotate counter-clockwise key',
    desc: 'Rotates the preview image 90 degrees counter-clockwise when this key is pressed.',
  },
  PREVIEW_MODE_ZOOM_IN_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 107, key: "+", modifierKeys: []}, // Numpad "+" key.
    name: 'Preview mode zoom in key',
    desc: 'Zooms in the preview image when this key is pressed.',
  },
  PREVIEW_MODE_ZOOM_OUT_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 109, key: "-", modifierKeys: []}, // Numpad "-" key.
    name: 'Preview mode zoom out key',
    desc: 'Zooms out the preview image when this key is pressed.',
  },
  PREVIEW_MODE_TOGGLE_FIT_KB: {
    type: "kbd",
    value: {enabled: true, keyCode: 106, key: "*", modifierKeys: []}, // Numpad "*" key.
    name: 'Preview mode toggle fullsize key',
    desc: 'Toggles the preview image between full size view and fit to screen view when this key is pressed.',
  },

  /* Dropdown button appearance */

  BUTTON_WIDTH: {
    type: "number",
    value: 25,
    min: 10,
    max: 100,
    step: 1,
    name: 'Dropdown button width',
    desc: 'CSS pixel unit value.',
  },
  BUTTON_TEXT_COLOR: {
    type: "text",
    value: '#ffffff',
    name: 'Dropdown button text color',
    desc: 'CSS color value.',
  },
  BUTTON_BG_COLOR: {
    type: "text",
    value: '#6495ed',
    name: 'Dropdown button background color',
    desc: 'CSS color value.',
  },
  BUTTON_HOVER_BG_COLOR: {
    type: "text",
    value: '#519c60',
    name: 'Dropdown button background color on hover',
    desc: 'CSS color value.',
  },
  BUTTON_OPACITY: {
    type: "number",
    value: 0.75,
    min: 0,
    max: 1,
    step: 0.01,
    name: 'Dropdown button opacity',
    desc: 'CSS alpha value. Range [0.0, 1.0].',
  },
  BUTTON_HOVER_OPACITY: {
    type: "number",
    value: 0.9,
    min: 0,
    max: 1,
    step: 0.01,
    name: 'Dropdown button opacity on hover',
    desc: 'CSS alpha value. Range [0.0, 1.0].',
  },

  /* Dropdown menu appearance */

  CONTENT_TEXT_COLOR: {
    type: "text",
    value: '#000000',
    name: 'Dropdown menu text color',
    desc: 'CSS color value.',
  },
  CONTENT_TEXT_SIZE: {
    type: "number",
    value: 18,
    min: 5,
    max: 100,
    step: 1,
    name: 'Dropdown menu text size',
    desc: 'CSS pixel unit value.',
  },
  CONTENT_A_BG_COLOR: {
    type: "text",
    value: '#e8e9db',
    name: 'Dropdown menu anchor element background color',
    desc: 'CSS color value.',
  },
  CONTENT_A_HOVER_BG_COLOR: {
    type: "text",
    value: '#cfdbe1',
    name: 'Dropdown menu anchor element background color on hover',
    desc: 'CSS color value.',
  },
  CONTENT_DIV_BG_COLOR: {
    type: "text",
    value: '#e7e4c5',
    name: 'Dropdown menu preview element background color',
    desc: 'CSS color value.',
  },
  CONTENT_DIV_HOVER_BG_COLOR: {
    type: "text",
    value: '#8dc5ed',
    name: 'Dropdown menu preview element background color on hover',
    desc: 'CSS color value.',
  },
}


const getSettingValue = (key, settings) => {
  const value = settings[key]?.value;
  const defaultValue = defaultSettings[key].value;
  if (typeof value === typeof defaultValue) {
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(defaultValue)) {
        if (typeof v !== typeof value[k]) {
          return defaultValue;
        }
      }
    }
    return value;
  }
  return defaultValue;
}

const o = { KEYBINDINGS: {} };
const storedSettings = GM_getValue('settings', {});

for (const key in defaultSettings) {
  const value = getSettingValue(key, storedSettings);
  o[key] = value;
  if (key.endsWith('_KB') && value.enabled) {
    o.KEYBINDINGS[value.keyCode] = {"setting": key, "data": value};
  }
}

const LICENSE_INFO = [
  {
    value: '0',
    text: 'All rights reserved',
    url: 'https://flickrhelp.com/hc/en-us/articles/4404078674324-Change-Your-Photo-s-License-in-Flickr'
  },
  {
    value: '1',
    text: 'Attribution-NonCommercial-ShareAlike',
    url: 'https://creativecommons.org/licenses/by-nc-sa/2.0/'
  },
  {
    value: '2',
    text: 'Attribution-NonCommercial',
    url: 'https://creativecommons.org/licenses/by-nc/2.0/'
  },
  {
    value: '3',
    text: 'Attribution-NonCommercial-NoDerivs',
    url: 'https://creativecommons.org/licenses/by-nc-nd/2.0/'
  },
  {
    value: '4',
    text: 'Attribution',
    url: 'https://creativecommons.org/licenses/by/2.0/'
  },
  {
    value: '5',
    text: 'Attribution-ShareAlike',
    url: 'https://creativecommons.org/licenses/by-sa/2.0/'
  },
  {
    value: '6',
    text: 'Attribution-NoDerivs',
    url: 'https://creativecommons.org/licenses/by-nd/2.0/'
  },
  {
    value: '7',
    text: 'No known copyright restrictions',
    url: '/commons/usage/'
  },
  {
    value: '8',
    text: 'United States government work',
    url: 'http://www.usa.gov/copyright.shtml'
  },
  {
    value: '9',
    text: 'Public Domain Dedication (CC0)',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/'
  },
  {
    value: '10',
    text: 'Public Domain Work',
    url: 'https://creativecommons.org/publicdomain/mark/1.0/'
  }
];

const STYLE = `

  :root.dmfl-preview-mode, .dmfl-modal-mode {
    overflow: hidden;
  }

  /*
   ================
   === Dropdown ===
   ================
  */

  .dmfl-dropdown-container {
    width: ${o.BUTTON_WIDTH}px;
    height: ${o.BUTTON_WIDTH}px;
    display: block;
    cursor: pointer;
    z-index: 203;
  }

  .dmfl-dropdown-container.dmfl-thumbnail {
    position: absolute;
    width: max-content;
    height: max-content;
    padding: 3px;
  }

  .dmfl-dropdown-container.dmfl-engagement-view {
    display: flex;
    position: relative;
  }

  .dmfl-dropdown-container.dmfl-main-photo-page {
    align-items: center;
    margin-right: 12px;
  }

  .dmfl-dropdown-container:hover .dmfl-dropdown-content {
    display: block;
  }

  .dmfl-dropdown-container:hover .dmfl-dropdown-button.dmfl-populated {
    background-color: ${o.BUTTON_HOVER_BG_COLOR};
    opacity: ${o.BUTTON_HOVER_OPACITY};
  }

  .dmfl-dropdown-button {
    display: flex;
    width: ${o.BUTTON_WIDTH}px;
    height: ${o.BUTTON_WIDTH}px;
    justify-content: center;
    align-items: center;
    font-size: calc(${o.BUTTON_WIDTH}px * 75 / 100);
    color: ${o.BUTTON_TEXT_COLOR};
    background-color: ${o.BUTTON_BG_COLOR};
    opacity: ${o.BUTTON_OPACITY};
  }

  .dmfl-dropdown-button.dmfl-populating {
    border-radius: 50%;
    -webkit-animation: dmfl-spin-anim 2s linear infinite; /* Safari */
    animation: dmfl-spin-anim 2s linear infinite;
    background-color: #a9b1c1b5;
    border: ${o.BUTTON_WIDTH / 10}px solid #f3f3f3;
    border-top: ${o.BUTTON_WIDTH / 10}px solid #3498db;
    opacity: .75;
  }

  .dmfl-dropdown-button.dmfl-thumbnail {
    position: relative;
  }

  .dmfl-dropdown-button.dmfl-engagement-view {
    position: absolute;
  }

  .dmfl-dropdown-button.dmfl-populated-fail {
    background-color: #f08080; /* lightcoral */
  }

  .dmfl-dropdown-content {
    display: none;
    width: max-content;
    height: max-content;
    background-color: #f1f1f1;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    font-size: ${o.CONTENT_TEXT_SIZE}px;
    text-align: center;
    text-decoration: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

  .dmfl-dropdown-content.dmfl-thumbnail {
    position: relative;
  }

  .dmfl-dropdown-content.dmfl-engagement-view {
    position: absolute;
    right: 0;
    bottom: ${o.BUTTON_WIDTH}px;
  }

  .dmfl-dropdown-content.dmfl-populated-fail {
    background-color: #efe4eb;
    box-shadow: inset 0px 0px 5px 0px rgba(0, 0, 0, 0.2);
    max-width: 300px;
    padding: 5px;
    text-align: left;
  }

  .dmfl-dropdown-entry {
    display: grid;
    grid-template-columns: 1fr auto;
    white-space: nowrap;
    cursor: pointer;
  }

  .dmfl-dropdown-entry a, .dmfl-dropdown-entry-preview-button {
    padding: 5px 10px;
  }

  .dmfl-dropdown-entry a {
    color: ${o.CONTENT_TEXT_COLOR};
    background-color: ${o.CONTENT_A_BG_COLOR};
  }

  .dmfl-dropdown-entry a:hover {
    background-color: ${o.CONTENT_A_HOVER_BG_COLOR};
  }

  .dmfl-dropdown-entry .dmfl-dropdown-entry-preview-button {
    font-family: sans-serif;
    font-weight: lighter;
    color: ${o.CONTENT_TEXT_COLOR};
    background-color: ${o.CONTENT_DIV_BG_COLOR};
  }

  .dmfl-dropdown-entry .dmfl-dropdown-entry-preview-button:hover {
    background-color: ${o.CONTENT_DIV_HOVER_BG_COLOR};
    opacity: .9;
  }

  /*
   ====================
   === Preview mode ===
   ====================
  */

  .dmfl-preview-background {
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.9);
    display: flex;
    position: fixed;
    z-index: 30000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

  .dmfl-preview-image-container {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }

  .dmfl-preview-image {
    --translateX: 0;
    --translateY: 0;
    cursor: grab;
    max-width: none;
    max-height: none;
    width: auto;
    height: auto;
    display: block;
    margin: 0;
    translate: var(--translateX) var(--translateY);
  }

  .dmfl-preview-image.dmfl-fit {
    max-width: 100vw;
    max-height: 100vh;
    object-fit: scale-down;
  }

  .dmfl-preview-image.dmfl-fit.dmfl-swap-dim {
    max-width: 100vh;
    max-height: 100vw;
  }

  .dmfl-preview-controls-container {
    display: flex;
    align-items: center;
    font-size: 2rem;
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 30001;
    color: honeydew;
    cursor: pointer;
    opacity: 0;
    transition: opacity 1s;
  }

  .dmfl-preview-controls-main-button {
    display: flex;
    justify-content: left;
    align-items: center;
    width: 50px;
    height: 50px;
    background-color: #7a8191;
    border-radius: 10px;
    opacity: .35;
    transition: all 0.5s ease-out;
  }

  .dmfl-preview-controls-main-button:hover {
    width: 350px;
    background-color: #586887;
    opacity: 1;
  }

  .dmfl-preview-controls-main-button > span {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    rotate: 0deg;
    transition: rotate 0.5s linear;
  }

  .dmfl-preview-controls-main-button:hover > span {
    rotate: 90deg;
  }

  .dmfl-preview-controls-button-strip {
    display: none;
  }

  .dmfl-preview-controls-main-button:hover .dmfl-preview-controls-button-strip {
    display: inline-flex;
    width: 100%;
    margin-left: 50px;
  }

  .dmfl-preview-controls-button-strip > span {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    opacity: 0;
    transform-origin: bottom;
    transform: translateY(50px);
    animation-name: dmfl-preview-controls-anim;
    animation-timing-function: ease-out;
    animation-fill-mode: forwards;
    animation-duration: 0.2s;
    margin-right: 10px;
  }

  .dmfl-preview-controls-rot-cw {
    animation-delay: 0.3s;
  }

  .dmfl-preview-controls-rot-ccw {
    animation-delay: 0.4s;
  }

  .dmfl-preview-controls-toggle-fit {
    animation-delay: 0.5s;
  }

  .dmfl-preview-controls-zoom-in {
    animation-delay: 0.6s;
  }

  .dmfl-preview-controls-zoom-out {
    animation-delay: 0.7s;
  }

  .dmfl-preview-controls-button-strip > span:hover {
    color: #7fffd4; /* aquamarine */
  }

  @keyframes dmfl-preview-controls-anim {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dmfl-preview-close-button {
    position: absolute;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    width: 2.5rem;
    height: 2.5rem;
    top: 20px;
    right: 20px;
    font-size: 2.5rem;
    font-weight: bold;
    color: honeydew;
    opacity: .65;
    text-shadow: 1px 1px 1px black;
    z-index: 30001;
    cursor: pointer;
  }

  .dmfl-preview-close-button:hover {
    color: #f3c84b;
  }

  .dmfl-preview-download-button {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 2rem;
    height: 50px;
    width: 50px;
    color: honeydew !important;
    background-color: ${o.BUTTON_BG_COLOR};
    position: fixed;
    z-index: 30001;
    right: 20px;
    bottom: 20px;
    border-radius: 10px;
    opacity: .75;
  }

  .dmfl-preview-download-button:hover {
    background-color: ${o.BUTTON_HOVER_BG_COLOR};
    opacity: 1;
  }

  .dmfl-preview-license-info-anchor {
    display: flex;
    color: honeydew !important;
    position: fixed;
    z-index: 30001;
    left: 20px;
    bottom: 20px;
  }

  /*
   ======================
   === Settings modal ===
   ======================
  */

  .dmfl-settings-modal {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed; /* Stay in place */
    z-index: 20000; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgb(0,0,0); /* Fallback color */
    background-color: rgba(0,0,0,0.6); /* Black w/ opacity */
  }

  .dmfl-settings-modal-content {
    display: flex;
    flex-direction: column;
    position: absolute;
    background-color: #fefefe;
    padding: 1.25rem;
    border: 1px solid #888;
    width: max-content;
    max-height: 80%;
    overflow: hidden;
    overscroll-behavior: contain;
    border-radius: 10px;
    scale: 1;
    transition: scale 1s ease-in;
    transition-delay: 0.1s;
  }

  .dmfl-settings-modal-content h2 {
    font-size: 25px !important;
    line-height: normal !important;
    color: #000;
  }

  .dmfl-settings-modal-body {
    display: grid;
    row-gap: 5px;
    overflow: auto;
  }

  .dmfl-settings-modal-header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.75rem;
    font-size: 2em;
    font-weight: bold;
  }

  .dmfl-settings-modal-footer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.25rem;
  }

  .dmfl-settings-modal-save-button, .dmfl-settings-modal-restore-defaults-button {
    height: 2.25rem !important;
    transition: none !important;
  }

  .dmfl-settings-modal-entry {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 5px 0px 5px 5px;
    box-sizing: border-box;
  }

  .dmfl-settings-modal-entry:nth-child(odd) {
    background: #f2f2f2;
  }

  .dmfl-settings-modal-label {
    position: relative;
    display: flex;
    margin-right: 10px;
  }

  .dmfl-settings-modal-entry input {
    margin: 0 10px 0 10px !important;
  }

  .dmfl-settings-modal-entry input[type="number"] {
    text-align: center;
    width: 65px;
    padding-block: 2px;
  }

  .dmfl-settings-modal-tooltiptext {
    visibility: hidden;
    width: max-content;
    max-width: 300px;
    background-color: #65779f;
    box-shadow: 0px 0px 5px 0px #6c7ea9;
    color: #fff;
    text-align: left;
    border-radius: 6px;
    padding: 10px;

    /* Position the tooltip */
    position: absolute;
    z-index: 1;
    left: -9999px;
    top: -9999px;

    /* Fade in tooltip */
    opacity: 0;
    transition: opacity 0.5s;
  }

  .dmfl-settings-modal-color-picker {
    display: inline-block;
    margin: 0 10px 0 10px !important;
  }

  .dmfl-settings-modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    color: #aaaaaa;
    font-size: 2.5rem;
    font-weight: bold;
    cursor: pointer;
  }

  .dmfl-settings-modal-close:hover,
  .dmfl-settings-modal-close:focus {
    color: #a97174;
    text-decoration: none;
  }

  .dmfl-settings-modal-change-key-button {
    height: 25px !important;
    line-height: normal !important;
    margin: 0 10px 0 10px !important;
    vertical-align: inherit !important;
    padding: 0 15px !important;
    transition: none !important;
  }

  .dmfl-settings-modal-kbd {
    border: 2px solid #cdcdcd;
    border-radius: 0.25rem;
    box-shadow: inset 0 -1px 0 0 #cdcdcd;
    font-size: .825rem;
    padding: .25rem;
    box-sizing: border-box;
    font-family: monospace;
    font-weight: 600;
    line-height: 1.5;
    text-align: left;
    margin: 0 10px 0 10px !important;
  }

  .dmfl-settings-modal-select {
    font-size: 100%;
    margin: 0 10px 0 10px !important;
    border: 1px solid darkgray;
  }

  /*
   ======================
   === Popup messages ===
   ======================
  */

  .dmfl-message-container {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    visibility: hidden;
    color: #fff; /* White text */
    border: 1px solid rgba(119, 233, 220, 0.31);
    opacity: 0; /* Initially hidden */
    transition: opacity 0.35s ease-in-out;
    cursor: default;
    z-index: 99999;
  }

  .dmfl-message-container-topleft {
    box-sizing: content-box;
    border-radius: 10px;
    top: ${o.PREVIEW_MODE_SHOW_CONTROLS ? 80 : 20}px;
    left: 20px;
    width: 44px;
    height: 44px;
    max-width: 100%;
    background-color: rgba(95, 129, 191, 0.7);
    font-size: 1.1rem;
    font-weight: 500;
    padding: 2px;
  }

  .dmfl-message-container-bottom {
    border-radius: 3px;
    bottom: 20px;
    left: 50%;
    min-width: 300px;
    background-color: rgb(47 57 76 / 85%);
    font-size: 18px;
    padding: 10px 20px;
    transform: translateX(-50%);
  }

  /*
   ==============================
   === Main loading indicator ===
   ==============================
  */

  .dmfl-loader-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .dmfl-loader {
    position: relative;
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 45px;
    height: 45px;
    opacity: .65;
    -webkit-animation: dmfl-spin-anim 2s linear infinite; /* Safari */
    animation: dmfl-spin-anim 2s linear infinite;
  }

  /* Safari */
  @-webkit-keyframes dmfl-spin-anim {
    0% { -webkit-transform: rotate(0deg); }
    100% { -webkit-transform: rotate(360deg); }
  }

  @keyframes dmfl-spin-anim {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /*
   ======================
   === Startup loader ===
   ======================
  */

  .dmfl-startup-loader {
    display: flex;
    bottom: 70px;
    left: 50%;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    z-index: 60000;
    font-size: 30px;
    color: ${o.BUTTON_TEXT_COLOR};
    background: ${o.BUTTON_BG_COLOR};
    position: fixed;
    cursor: wait;
    animation: dmfl-startup-anim 3s infinite;
    -moz-animation: dmfl-startup-anim 3s infinite;
    -webkit-animation: dmfl-startup-anim 3s infinite;
    -o-animation: dmfl-startup-anim 3s infinite;
    border-radius: 0px;
    -webkit-border-radius: 0px;
  }

  @keyframes dmfl-startup-anim {
    0% {transform: translateX(-50%) rotate(0deg);}
    50% {transform: translateX(-50%) rotate(180deg); background:${o.BUTTON_HOVER_BG_COLOR};}
    100% {transform: translateX(-50%) rotate(360deg);}
  }
`;

const nodesProcessed = new Map();
const nodesBlacklisted = new Set();
const idsPopulating = new Set();
const messages = {};

const cache = Object.create(null);

let lastURL, lastRootView;
let lastScrollX, lastScrollY;
let lastScrollHeight, lastScrollWidth;

let mainPhoto = null;
let isLightboxPage = false;
let lightboxIntervalID = null;


let overlayContainer;
let messageContainerBottom;
let messageContainerTopleft;

let appInitOk = false;
let appInitComplete = false;

let pageContent;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isLightboxURL(url) {
  return url.lastIndexOf('/lightbox') > 34;
}

function hasClass(node, className) {
  return node.classList?.contains(className);
}

function isDropdownElement(el) {
  return el?.getAttribute?.('class')?.startsWith?.('dmfl-dropdown');
}

function isValidImageURL(url) {
  return /(live|farm[\d]*)\.static\.?flickr\.com\/[\d]+\/[\d]+_[a-z0-9]+(_[a-z0-9]{1,2})?\.[a-z0-9]{3,4}$/.test(url);
}

function isValidHref(href) {
  return /flickr\.com\/(photos(?!\/tags\/)\/[-\w@]+\/[0-9]+|gp\/[-\w@]+\/[\w]+)(?!.*\/sizes\/)/.test(href);
}

function showMessage(text, duration, container) {
  container.textContent = text;
  container.style.visibility = 'visible';
  container.style.opacity = 1;
  clearTimeout(messages[container.className]);
  const messageTimeoutId = setTimeout(() => {
    container.style.opacity = 0;
    setTimeout(() => {
      if (container.style.getPropertyValue('opacity') != 0) return;
      container.style.visibility = 'hidden';
      container.textContent = '';
    }, 350);
  }, duration);
  messages[container.className] = messageTimeoutId;
}


const previewControlsHTML = `
<div class="dmfl-preview-controls-main-button">
  <span class="dmfl-preview-controls-main-button-text">\u2699</span>
  <div class="dmfl-preview-controls-button-strip">
    <span class="dmfl-preview-controls-rot-cw">\u21BB</span>
    <span class="dmfl-preview-controls-rot-ccw">\u21BA</span>
    <span class="dmfl-preview-controls-toggle-fit">\u21F1</span>
    <span class="dmfl-preview-controls-zoom-in">\u229E</span>
    <span class="dmfl-preview-controls-zoom-out">\u229F</span>
  </div>
</div>
`;

const settingsModalHTML = `
<form class="dmfl-settings-modal-content" method="dialog">
  <span class="dmfl-settings-modal-close">&times;</span>
  <header class="dmfl-settings-modal-header">
    <h2>${SCRIPT_NAME}  \u27b2  Settings</h2>
  </header>
  <div class="dmfl-settings-modal-body"></div>
  <footer class="dmfl-settings-modal-footer">
    <button class="dmfl-settings-modal-save-button" type="submit" disabled>Save &amp; Reload</button>
    <button class="dmfl-settings-modal-restore-defaults-button">Restore defaults</button>
  </footer>
</form>
`;


function showSettings() {
  if (document.querySelector('.dmfl-settings-modal')) return;

  const modal = document.createElement('div');
  modal.className = 'dmfl-settings-modal';
  modal.innerHTML = settingsModalHTML;
  document.body.appendChild(modal);

  const modalContent = modal.querySelector('.dmfl-settings-modal-content');
  const modalClose = modal.querySelector('.dmfl-settings-modal-close');
  const modalSave = modal.querySelector('.dmfl-settings-modal-save-button');
  const modalRestore = modal.querySelector('.dmfl-settings-modal-restore-defaults-button');
  const modalBody = modal.querySelector('.dmfl-settings-modal-body');
  const msgContainer = messageContainerBottom;
  const state = {};

  const onValueChanged = function() {
    modalSave.disabled = false;
    modalRestore.disabled = false;
  }

  const removeKeyListeners = () => {
    if (state.detectKeyDown) document.removeEventListener('keydown', state.detectKeyDown, true);
    if (state.detectKeyUp) document.removeEventListener('keyup', state.detectKeyUp, true);
    state.detectKeyDown = null;
    state.detectKeyUp = null;
    state.detectingKey = false;
    if (state.changeKeyButtonPressed) {
      state.changeKeyButtonPressed.textContent = 'Change';
      state.changeKeyButtonPressed.disabled = false;
    }
  }

  const fillBody = (settings) => {
    const tempSettings = state.tempSettings;
    for (const [key, defaultSetting] of Object.entries(defaultSettings)) {
      const entry = document.createElement('div');
      entry.className = 'dmfl-settings-modal-entry';

      if (!tempSettings[key]) {
        tempSettings[key] = {};
      }

      const settingValue = getSettingValue(key, settings);
      tempSettings[key].value = settingValue;

      const entryChildren = [];

      const label = document.createElement('label');
      label.className = 'dmfl-settings-modal-label';
      label.textContent = defaultSetting.name;

      if (defaultSetting.desc) {
        const t = defaultSetting.type;
        const v = defaultSetting.value;
        const o = defaultSetting.opts;
        let dval = t == "kbd" ? v.key : t == "select" ? o[v] : v;
        const tooltipText = document.createElement('span');
        tooltipText.className = 'dmfl-settings-modal-tooltiptext';
        tooltipText.innerText = `${defaultSetting.desc}\n\nDefault: ` +
                                `${String(dval).replace(/^true$/, 'On').replace(/^false$/, 'Off')}`;
        label.style.borderBottom = '1px dotted black';
        label.style.cursor = 'context-menu';
        label.onmouseenter = () => {
          tooltipText.style.transitionDelay = '0.7s';
          const rect = label.getBoundingClientRect();
          const down = rect.y < (innerHeight / 2);
          tooltipText.style.top = down ? `${rect.top - 5}px` : `${rect.bottom + 5 - tooltipText.getBoundingClientRect().height}px`;
          tooltipText.style.left = `${rect.left + rect.width + 10}px`;
          tooltipText.style.visibility = 'visible';
          requestAnimationFrame(() => {
            tooltipText.style.opacity = 1;
          });
        }
        label.onmouseleave = () => {
          tooltipText.style.transitionDelay = 'unset';
          tooltipText.style.opacity = 0;
          tooltipText.style.visibility = 'hidden';
          tooltipText.style.top = '-9999px';
          tooltipText.style.left = '-9999px';
        }
        modal.appendChild(tooltipText);
      }

      entryChildren.push(label);

      if (/(text|number|boolean)/.test(defaultSetting.type)) {
        const inputElem = document.createElement('input');
        inputElem.className = 'dmfl-settings-modal-input';

        let valGetter, valSetter;
        if (typeof defaultSetting.value === 'boolean') {
          inputElem.setAttribute('type', 'checkbox');
          valGetter = 'checked';
          valSetter = 'checked';
        } else if (typeof defaultSetting.value === 'number') {
          inputElem.setAttribute('type', 'number');
          inputElem.setAttribute('min', defaultSetting.min);
          inputElem.setAttribute('max', defaultSetting.max);
          inputElem.setAttribute('step', defaultSetting.step);
          inputElem.required = true;
          valGetter = 'valueAsNumber';
          valSetter = 'value';
        } else {
          inputElem.setAttribute('type', 'text');
          valGetter = 'value';
          valSetter = 'value';
        }
        inputElem[valSetter] = settingValue;
        inputElem.addEventListener('input', () => {
          onValueChanged();
          tempSettings[key].value = inputElem[valGetter];
        });
        entryChildren.push(inputElem);
        if (key.indexOf('_COLOR') >= 0) {
          const colorPicker = document.createElement('input');
          colorPicker.className = 'dmfl-settings-modal-color-picker';
          colorPicker.setAttribute('type', 'color');
          colorPicker.value = inputElem.value;
          colorPicker.addEventListener('input', () => {
            inputElem.value = colorPicker.value;
            inputElem.dispatchEvent(new Event('input'));
          })
          entryChildren.push(colorPicker);
        }
      } else if (defaultSetting.type == "kbd") {
        const inputElem = document.createElement('input');
        inputElem.setAttribute('type', 'checkbox');
        inputElem.checked = settingValue.enabled;

        const kbdElem = document.createElement('kbd');
        kbdElem.className = 'dmfl-settings-modal-kbd';
        kbdElem.textContent = settingValue.key;

        const changeKeyButton = document.createElement('button');
        changeKeyButton.className = 'dmfl-settings-modal-change-key-button';
        changeKeyButton.textContent = 'Change';

        if (!inputElem.checked) {
          kbdElem.style.visibility = 'hidden';
          changeKeyButton.style.visibility = 'hidden';
        }

        changeKeyButton.onclick = (e) => {
          e.preventDefault();
          if (state.detectingKey) return;

          state.detectKeyUp = (e) => {
            e.preventDefault();
            e.stopPropagation();
          }

          state.detectKeyDown = (e) => {
            if (/^(Shift|Alt|Control|Meta)$/.test(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            let keyUnavailable;
            for (const [k, obj] of Object.entries(tempSettings)) {
              if (/_KB$/.test(k) && k != key && obj.value.keyCode == e.keyCode && obj.value.modifierKeys.every(modKey => e[modKey] === true)) {
                const msg = `Key '${e.key}' already assigned to setting '${defaultSettings[k].name}'.`;
                console.log(msg);
                showMessage(msg, 4000, msgContainer);
                keyUnavailable = true;
              }
            }
            if (!keyUnavailable) {
              onValueChanged();
              const mk = ["shiftKey", "altKey", "ctrlKey", "metaKey"].filter(modKey => e[modKey] === true);
              tempSettings[key].value = {"enabled": true, "keyCode": e.keyCode, "key": e.key, "modifierKeys": mk};
              kbdElem.textContent = e.key;
              console.debug(`${key} value changed: keyCode: ${e.keyCode} | key: ${e.key} | modKeys:`, mk);
            }
            removeKeyListeners();
          }

          changeKeyButton.disabled = true;
          changeKeyButton.textContent = 'Press any key';
          document.addEventListener('keydown', state.detectKeyDown, true);
          document.addEventListener('keyup', state.detectKeyUp, true);
          state.changeKeyButtonPressed = changeKeyButton;
          state.detectingKey = true;
        }

        inputElem.addEventListener('input', () => {
          if (state.detectingKey) removeKeyListeners();
          onValueChanged();
          tempSettings[key].value.enabled = inputElem.checked;
          const vis = inputElem.checked ? 'visible' : 'hidden';
          kbdElem.style.visibility = vis;
          changeKeyButton.style.visibility = vis;
        });
        entryChildren.push(inputElem);
        entryChildren.push(kbdElem);
        entryChildren.push(changeKeyButton);
      } else if (defaultSetting.type == "select") {
        const selectElem = document.createElement('select');
        selectElem.className = 'dmfl-settings-modal-select';
        for (const [oKey, oVal] of Object.entries(defaultSetting.opts)) {
          const selectOpt = document.createElement('option');
          selectOpt.value = oKey;
          selectOpt.textContent = oVal;
          selectElem.appendChild(selectOpt);
        }
        selectElem.value = settingValue;
        selectElem.addEventListener('change', (e) => {
          onValueChanged();
          console.debug(`${key} value changed: ${e.target.value}`);
          tempSettings[key].value = e.target.value;
        });
        entryChildren.push(selectElem);
      }

      entryChildren.forEach(child => entry.appendChild(child));
      modalBody.appendChild(entry);
    }
  }

  state.tempSettings = GM_getValue('settings', {});
  fillBody(state.tempSettings);
  document.querySelector(':root').classList.add('dmfl-modal-mode');

  modalClose.onclick = function() {
    removeKeyListeners();
    document.querySelector(':root').classList.remove('dmfl-modal-mode');
    modal.remove();
  }
  modalRestore.onclick = function() {
    removeKeyListeners();
    modalBody.innerHTML = '';
    state.tempSettings = {};
    fillBody(defaultSettings);
    modalSave.disabled = false;
    modalRestore.disabled = true;
  }
  modalContent.onsubmit = function(e) {
    if (e.submitter != modalSave) return;
    modalSave.disabled = true;
    modalRestore.disabled = true;
    removeKeyListeners();
    GM_setValue('settings', state.tempSettings);
    modalContent.style.setProperty('scale', 0);
    setTimeout(() => {
      const loader = document.createElement('div');
      loader.className = "dmfl-loader";
      modal.appendChild(loader);
      window.location.reload();
    }, 1000);
  }
}


class PreviewMode {
  static bg;
  static img;
  static img_w;
  static img_h;
  static img_offsetX = 0;
  static img_offsetY = 0;
  static animationFrameId;
  static isDragging;
  static zoomFactor = 0.05;
  static active;

  static enter(data) {
    const bg = document.createElement('div');
    bg.className = 'dmfl-preview-background';
    this.bg = bg;

    if (o.PREVIEW_MODE_EXIT_ON_MOUSE_EVENT) {
      bg.addEventListener(o.PREVIEW_MODE_EXIT_ON_MOUSE_EVENT, (e) => {
        if (/^dmfl-preview-controls/.test(e.target.getAttribute('class'))) return;
        this.exit();
      });
    }

    if (o.PREVIEW_MODE_SHOW_CLOSE_BUTTON) {
      const closeBut = document.createElement('span');
      closeBut.className = 'dmfl-preview-close-button';
      closeBut.innerHTML = '&times;'
      closeBut.onclick = () => this.exit();
      bg.appendChild(closeBut);
    }

    document.body.appendChild(bg);

    const dlBut = document.createElement('a');
    dlBut.className = 'dmfl-preview-download-button';
    dlBut.innerText = '\u21e3';
    dlBut.onclick = (e) => {
      e.preventDefault();
      dl(data.downloadURL, data.downloadFilename);
      this.exit();
    }
    bg.appendChild(dlBut);

    if (data.licenseInfo) {
      const licenseInfoAnchor = document.createElement('a');
      licenseInfoAnchor.className = 'dmfl-preview-license-info-anchor';
      licenseInfoAnchor.setAttribute('href', data.licenseInfo.url);
      licenseInfoAnchor.innerText = `License: ${data.licenseInfo.text}`;
      licenseInfoAnchor.onclick = (e) => {
        GM_openInTab(licenseInfoAnchor.href, false);
        e.preventDefault();
        e.stopPropagation();
      }
      bg.appendChild(licenseInfoAnchor);
    }

    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'dmfl-loader-container';
    const loader = document.createElement('div');
    loader.className = "dmfl-loader";
    loaderContainer.appendChild(loader);
    bg.appendChild(loaderContainer);

    const img = document.createElement('img');
    img.setAttribute('width', data.item.width);
    img.setAttribute('height', data.item.height);
    img.className = 'dmfl-preview-image';

    this.img = img;
    this.img_w = data.item.width;
    this.img_h = data.item.height;

    const imgContainer = document.createElement('div');
    imgContainer.className = 'dmfl-preview-image-container';
    bg.appendChild(imgContainer);

    img.onload = () => {
      loaderContainer.remove();
      img.dataset.dmflScale = this.getCurrentScale();
      this.showControls();
    }

    img.onerror = () => loaderContainer.remove();

    img.onmousedown = (e) => {
      if (e.button != 0) return;
      e.preventDefault();
      e.stopPropagation();
      img.style.cursor = 'grabbing';
      this.isDragging = true;
      const cs = getComputedStyle(img);
      this.img_offsetX = e.clientX - parseFloat(cs.getPropertyValue('--translateX'));
      this.img_offsetY = e.clientY - parseFloat(cs.getPropertyValue('--translateY'));
    }

    bg.onmouseup = (e) => {
      if (e.button != 0 || !this.isDragging) return;
      e.stopPropagation();
      this.isDragging = false;
      img.style.cursor = 'grab';
      cancelAnimationFrame(this.animationFrameId);
    }

    bg.onmousemove = (e) => {
      if (this.isDragging) {
        this.animationFrameId = requestAnimationFrame(() => {
          img.style.setProperty('--translateX', `${e.clientX - this.img_offsetX}px`);
          img.style.setProperty('--translateY', `${e.clientY - this.img_offsetY}px`);
          e.stopPropagation();
        });
      }
    }

    if (o.PREVIEW_MODE_SCROLL_TO_ZOOM) {
      img.addEventListener('wheel', (e) => {
        if (e.deltaY == 0) return;
        const factor = e.deltaY > 0 ? -this.zoomFactor : this.zoomFactor;
        this.scale(factor);
      }, {"passive": true});
    }

    img.src = data.imageURL;
    img.classList.add('dmfl-fit');
    imgContainer.appendChild(img);

    document.querySelector(':root').classList.add('dmfl-preview-mode');
    this.active = true;
  }

  static getCurrentScale() {
    return Number((this.img.getBoundingClientRect().width / this.img_w).toFixed(5));
  }

  static showZoomPercentage() {
    showMessage(`${parseInt(this.img.dataset.dmflScale * 100)}%`, 1000, messageContainerTopleft);
  }

  static setFullsize() {
    this.img.style.removeProperty('scale');
    this.img.classList.remove('dmfl-fit');

    this.img.classList.add('dmfl-fullsize');
    this.img.dataset.dmflScale = 1;
  }

  static setFit() {
    this.img.style.removeProperty('scale');
    this.img.classList.remove('dmfl-fullsize');

    this.img.classList.add('dmfl-fit');
    this.img.style.setProperty('--translateX', 0);
    this.img.style.setProperty('--translateY', 0);
    this.img.dataset.dmflScale = this.getCurrentScale();
  }

  static toggleFit() {
    const img = this.img;
    if (!img) return;
    if (!hasClass(img, 'dmfl-fullsize')) {
      this.setFullsize();
    } else {
      this.setFit();
    }
    this.showZoomPercentage();
  }

  static rotate(angle) {
    const img = this.img;
    if (!img) return;
    const imgContainer = img.parentNode;
    const rotation = Number(img.dataset.dmflRotation) || 0;
    let newAngle = rotation + angle;
    const newAngleAbs = Math.abs(newAngle);
    const swapDim = (newAngleAbs == 90 || newAngleAbs == 270);
    if (newAngleAbs == 360) newAngle = 0;
    if (swapDim) {
      img.classList.add('dmfl-swap-dim');
    } else {
      img.classList.remove('dmfl-swap-dim');
    }
    img.style.rotate = `${newAngle}deg`;
    img.dataset.dmflRotation = newAngle;
  }

  static scale(factor) {
    if (this.img.dataset.dmflScale === undefined || !this.img.clientWidth || !this.img.naturalWidth) return;

    const lastScale = Number(this.img.dataset.dmflScale);
    let scale = lastScale + factor;

    this.img.classList.remove('dmfl-fit');

    if ((lastScale < 1 && scale > 1) || (lastScale > 1 && scale < 1)) scale = 1; // Snap to full-sized image
    scale = parseFloat(Math.max(0.1, Math.min(scale, 5)).toFixed(5)); // Limit scale to a range

    if (scale == 1) {
      this.img.classList.add('dmfl-fullsize');
    } else {
      this.img.classList.remove('dmfl-fullsize');
    }

    this.img.style.scale = scale;
    this.img.dataset.dmflScale = scale;

    this.showZoomPercentage();
  }

  static showControls() {
    if (!o.PREVIEW_MODE_SHOW_CONTROLS) return;
    const controls = document.createElement('div');
    controls.className = 'dmfl-preview-controls-container';
    controls.innerHTML = previewControlsHTML;
    this.bg.appendChild(controls);

    setTimeout(() => {
      requestAnimationFrame(() => {
        controls.style.setProperty('opacity', 1);
      });
    }, 100);

    controls.querySelector('.dmfl-preview-controls-rot-cw').onclick = () => this.rotate(90);
    controls.querySelector('.dmfl-preview-controls-rot-ccw').onclick = () => this.rotate(-90);
    controls.querySelector('.dmfl-preview-controls-toggle-fit').onclick = () => this.toggleFit();
    controls.querySelector('.dmfl-preview-controls-zoom-in').onclick = () => this.scale(this.zoomFactor);
    controls.querySelector('.dmfl-preview-controls-zoom-out').onclick = () => this.scale(-this.zoomFactor);
  }

  static clear() {
    document.querySelector(':root').classList.remove('dmfl-preview-mode');
    this.bg?.remove();
    this.bg = null;
    this.img = null;
    this.isDragging = false;
    this.active = false;
  }

  static exit() {
    if (!this.active) return;
    this.clear();
  }
}


class MouseTarget {
  static t;
  static data;
  static rect;
  static descriptor;
  static updateRect() {
    this.rect = this.t.getBoundingClientRect();
  }
  static set(data) {
    this.t = data.node;
    this.updateRect();
    this.descriptor = this.t.className || this.t.src || this.t.href;
    this.data = data;
    //console.debug(`Target: ${this.t.nodeName} ${this.descriptor}`);
  }
  static setPos(dc) {
    this.updateRect();
    dc.style.left = `${this.rect.left + window.scrollX}px`;
    dc.style.top = `${this.rect.top + window.scrollY}px`;
  }
  static isHovered(e) {
    return (
      e.clientX >= this.rect.left &&
      e.clientX <= this.rect.right &&
      e.clientY >= this.rect.top &&
      e.clientY <= this.rect.bottom
    );
  }
  static clear() {
    //console.debug('Clearing target.');
    Object.keys(this).forEach(k => { this[k] = null });
  }
}


function dropdownShow() {
  const dc = MouseTarget.data?.dropdownContainer;
  if (dc instanceof HTMLDivElement) {
    overlayContainer.appendChild(dc);
    MouseTarget.setPos(dc);
    overlayContainer.style.display = 'block';
  }
}

function dropdownHide() {
  overlayContainer.innerHTML = '';
  overlayContainer.style.display = 'none';
  lastScrollX = null;
  lastScrollY = null;
}

const sizesOrder = ["o", "8k", "7k", "6k", "5k", "4k", "3k", "k", "h", "l", "c", "z", "m", "w", "n", "s", "q", "t", "sq"];
async function appGetInfo(photoId) {
  if (!appInitOk) return;
  let ds, owner, ownerId, licenseInfo;
  try {
    const info = await unsafeWindow.appContext.getModel('photo-models', photoId);
    if (info.getValue) {
      ds = info.getValue('descendingSizes');
      owner = info.getValue('owner');
      ownerId = owner?.getValue('id') || owner?.getValue('nsid') || owner?.getValue('url')?.split('/')[2];
      licenseInfo = info.getPhotoLicenseInformation?.() || {};
    } else {
      const data = info.registry?._data?.[photoId];
      const sizes = data?.sizes;
      if (!sizes) {
        console.debug(`${photoId} : No sizes data in app registry`);
        return;
      }
      ds = Object.entries(sizes)
        .map(([key, value]) => { return { ...value, key } })
        .sort((a, b) => sizesOrder.indexOf(a) - sizesOrder.indexOf(b))
        .reverse();
      ownerId = data.owner?.id;
      licenseInfo = {'value': data.license};
    }
    if (ds) {
      console.debug(`${photoId} : Got info from app`);
      return {"descendingSizes": ds, "ownerId": ownerId, "licenseInfo": licenseInfo};
    }
  } catch(e) {
    if (typeof e === 'object' && e.stat === 'fail') {
      if (e.message === 'Photo not found') {
        console.debug(`${photoId} : YUI said: "${e.message}". Photo might be locked or is private. Trying xhr.`);
        return;
      }
      return e;
    }
    console.warn(e);
  }
}

async function xhrGetInfo(photoId, photoURL) {
  console.debug(`${photoId} : Sending xhr: ${photoURL}`);
  let status;
  const response = await GM.xmlHttpRequest({
    method: "GET",
    url: photoURL,
  }).catch(error => {
    console.log(`${photoId} : xhr error:`, error);
    status = error.status;
  });

  if (!response) return {"message": "Request unsuccessful.", "responseStatus": status};
  status = response.status;

  const dsMatch = response.responseText?.match(/descendingSizes":(\[.+?\])/);
  const ds = dsMatch?.[1];
  if (ds) {
    const licenseMatch = response.responseText?.match(/"license":(\d+)/);
    const licenseInfo = {"value": licenseMatch?.[1]};
    const ownerId = response.finalUrl.split('/')[4];
    console.debug(`${photoId} : Got info from xhr`);
    return {"descendingSizes": JSON.parse(ds), "ownerId": ownerId, "licenseInfo": licenseInfo, "responseStatus": status};
  } else {
    let msg = `${photoId} : No regex match at url ${response.finalUrl}`;
    let reason = '';
    if (response.finalUrl.endsWith('///')) reason += ' (photo not found)';
    if (response.responseText.match(/This photo is private/)) reason += ' (photo is private)';
    if (status != 200) reason += ` [status: ${status}]`;
    console.log(msg + reason);
    return {"message": reason.trimLeft(), "responseStatus": status};
  }
}

function dl(downloadURL, downloadFilename) {
  const timeoutAfter = 45000;
  let download, msg;
  const checkStatus = (responseObject, timeout) => {
    const status = responseObject.status;
    if (/^[045]/.test(status)) /* Violentmonkey */ {
      download.abort();
      console.warn('Download failed.', {responseObject});
      msg = `URL: ${downloadURL}\n\nDownload failed with status code: ${status}.`;
      if (timeout) msg += ` (Timed out after ${timeout / 1000}s)`;
    }
    if (responseObject.error) /* Tampermonkey */ {
      msg = `URL: ${downloadURL}\n\nDownload error: ${responseObject.error}`;
      console.warn(msg);
    }
    if (msg) GM_notification(msg, SCRIPT_NAME);
  };
  download = GM_download({
    url: downloadURL,
    name: downloadFilename,
    timeout: timeoutAfter,
    onprogress: (res) => { checkStatus(res) },
    ontimeout: (res) => { checkStatus(res, timeoutAfter) },
    onerror: (res) => { checkStatus(res) },
  });
}

async function populate(data) {

  if (!data.node || idsPopulating.has(data.photoId) || nodesBlacklisted.has(data.node)) return;
  const linkCount = data.dropdownContent.querySelectorAll('a').length;
  if (linkCount) {
    if (linkCount == 1 && /^5/.test(cache[data.photoId]?.responseStatus)) {
      console.debug('[populate] Last server response was 5xx. Retrying.');
      data.dropdownContent.innerHTML = '';
      delete cache[data.photoId];
    } else {
      //console.debug('[populate] Dropdown content is populated.');
      data.dropdownButton.classList.remove('dmfl-populating');
      return;
    }
  }

  if (!appInitComplete) {
    data.dropdownButton.style.cursor = 'progress';
    setTimeout(() => populate(data), 1000);
    return;
  }

  data.dropdownButton.classList.remove('dmfl-populated');
  data.dropdownButton.style.cursor = 'inherit';

  idsPopulating.add(data.photoId);

  if (data.populateFailed) {
    data.dropdownButton.classList.remove('dmfl-populated-fail');
    data.dropdownContent.classList.remove('dmfl-populated-fail');
    data.dropdownContent.innerText = '';
    data.populateFailed = false;
  }

  /* First try to get sizes info from the YUI `appContext` global variable.
   * Some of this object's methods might not be available as the UserScripts API
   * implementation may differ across userscript managers. For Chromium-based web
   * browsers this shouldn't be an issue. However, if the YUI module is not
   * available, a xhr will be sent as a fallback.
   *
   * Also, see note at the top of the file. */

  const photoId = data.photoId;
  const photoURL = data.photoURL;
  const cachedInfo = cache[photoId];

  if (!cachedInfo) {
    data.dropdownButton.textContent = '';
    data.dropdownButton.classList.add('dmfl-populating');
  } else {
    console.debug(`${photoId} : Got info from cache.`);
  }

  const info = cachedInfo || await appGetInfo(photoId) || await xhrGetInfo(photoId, photoURL);
  const author = data.author || info?.ownerId;

  let licenseInfo;
  if (o.SHOW_LICENSE_INFO && info?.licenseInfo?.value != null) {
    const licenseInfoValue = info.licenseInfo.value.toString();
    if (licenseInfoValue) {
      const isCompleteInfo = (info.licenseInfo.url != null) && (info.licenseInfo.text != null);
      licenseInfo = isCompleteInfo ? info.licenseInfo : LICENSE_INFO.find((item => item.value === licenseInfoValue));
    }
  }

  let descendingSizes = info?.descendingSizes;

  if (!Array.isArray(descendingSizes)) {
    let failMessage = 'No sizes found.';
    failMessage += info?.message ? `\n\n${info.message}` : '';
    console.log(`${photoId} : ${failMessage}`);
    if (data.isImage && data.node.naturalWidth != 0) {
      console.log(`${photoId} : Adding image src as sole entry.`);
      const imageData = Object.create(null);
      imageData.src = data.node.src;
      imageData.width = parseInt(data.node.getAttribute('width'));
      imageData.height = parseInt(data.node.getAttribute('height'));
      imageData.key = '?';
      descendingSizes = [imageData];
    } else {
      data.populateFailed = true;
      data.dropdownButton.classList.remove('dmfl-populated');
      data.dropdownButton.classList.remove('dmfl-populating');
      data.dropdownButton.classList.add('dmfl-populated-fail');
      data.dropdownButton.textContent = '\u26a0';
      data.dropdownContent.classList.add('dmfl-populated-fail');
      data.dropdownContent.innerText = failMessage;
    }
  }

  if (!cache[photoId]) {
    cache[photoId] = {
      'descendingSizes': descendingSizes,
      'ownerId': author,
      'licenseInfo': licenseInfo,
      'responseStatus': info?.responseStatus,
    }
  }

  if (data.populateFailed) {
    idsPopulating.delete(photoId);
    return;
  }

  for (const item of descendingSizes) {
    const imageURL = item.url || item.src || item.displayUrl;
    if (!imageURL) {
      console.debug("descendingSizes item has no url");
      continue;
    }
    const filename = imageURL.split('/').pop();
    const extension = filename.split('.').pop();
    const entry = document.createElement('div');
    entry.className = 'dmfl-dropdown-entry';
    const anchor = document.createElement('a');
    anchor.className = 'dmfl-dropdown-entry-anchor';
    let downloadURL = '';
    if (imageURL.startsWith('//')) {
      downloadURL += data.scheme;
    }
    downloadURL += imageURL.replace(/(\.[a-z]+)$/i, '_d$1');
    anchor.setAttribute('href', imageURL);
    anchor.textContent = `${item.width} x ${item.height} (${item.key})`;
    if (item.key == '?' && info?.message) {
      anchor.setAttribute('title', `All sizes not available ${info.message}`);
    }
    if (!extension.endsWith('jpg')) {
      anchor.textContent += ` [${extension}]`;
    }
    const downloadFilename = author && o.PREPEND_AUTHOR_ID ? `${author}_-_${filename}` : filename;
    anchor.addEventListener('click', (event) => {
      dl(downloadURL, downloadFilename);
      event.preventDefault();
    })
    entry.appendChild(anchor);
    const previewButton = document.createElement('div');
    previewButton.className = 'dmfl-dropdown-entry-preview-button';
    previewButton.textContent = '\u00a0\u229e\u00a0';

    const pmData = {};
    pmData.downloadURL = downloadURL;
    pmData.downloadFilename = downloadFilename;
    pmData.licenseInfo = licenseInfo;
    pmData.item = item;
    pmData.imageURL = imageURL;
    previewButton.onclick = () => PreviewMode.enter(pmData);

    entry.appendChild(previewButton);
    data.dropdownContent.appendChild(entry);
  }
  data.dropdownButton.classList.remove('dmfl-populating');
  data.dropdownButton.classList.add('dmfl-populated');
  data.dropdownButton.textContent = BUTTON_TEXT;
  idsPopulating.delete(photoId);
}


function processNode(node) {

  let href, isAnchor, isImage, isMainPhoto, isMainPageEngagement, isLightboxEngagement;

  if (node.nodeName == "A") {
    href = node.href;
    if (!isValidHref(href)) return;
    isAnchor = true;
  } else if (node.nodeName == "IMG") {
    isMainPhoto = node.classList.contains('main-photo');
    if (isMainPhoto) {
      if (o.MAIN_PHOTO_ENGAGEMENT_VIEW || isLightboxURL(document.URL)) return;
      href = document.URL;
    } else {
      if (!isValidImageURL(node.src)) return;
      const anchor = node.parentNode;
      if (!isValidHref(anchor?.href)) return;
      href = anchor.href;
    }
    isImage = true;
  } else if (/engagement/.test(node.className)) {
    if (!node.childElementCount) return;
    isMainPageEngagement = node.classList.contains('photo-engagement-view');
    if (isMainPageEngagement && !o.MAIN_PHOTO_ENGAGEMENT_VIEW) return;
    isLightboxEngagement = node.classList.contains('photo-card-engagement');
    href = document.URL;
  } else {
    return;
  }

  if (typeof href !== 'string') return;

  const photoIsLocked = (href.indexOf('flickr.com/gp/') >= 0);
  const photoIsUnlocked = (href.indexOf('flickr.com/photos/') >= 0);

  if (!photoIsLocked && !photoIsUnlocked) {
    console.debug(`(ignore) No valid href at ${document.URL} for node with className "${node.className}", href: ${href}`, node);
    return;
  }

  if (/\/(albums|groups|galleries)\//.test(href)) {
    console.debug('Blacklisting node with href:', href);
    nodesBlacklisted.add(node);
    return;
  }

  const components = href.split('/');
  const scheme = components[0];
  const author = components[4];
  const photoId = isImage && !isMainPhoto ? node.src.split('/').pop().split('_')[0] : components[5];

  if (!photoId) {
    console.debug("No photo ID found while processing node", node);
    nodesBlacklisted.add(node);
    return;
  }

  if (!photoIsLocked && isNaN(Number(photoId))) {
    console.debug(`Not a valid photoId "${photoId}"`, node);
    nodesBlacklisted.add(node);
    return;
  }

  components.length = Math.min(components.length, 5);
  components.push(photoId);

  const userSignedIn = Boolean(typeof unsafeWindow !== undefined ? unsafeWindow.appContext?.auth?.signedIn : null);
  const photoURL = photoIsLocked ? href :
                   userSignedIn ? `${window.location.origin}/photo.gne?id=${photoId}` :
                   components.join('/').replace('/gp/', '/photos/');


  const dropdownContainer = document.createElement('div');
  const dropdownButton = document.createElement('div');
  const dropdownContent = document.createElement('div');
  dropdownContainer.className = 'dmfl-dropdown-container';
  dropdownButton.className = 'dmfl-dropdown-button';

  dropdownButton.textContent = BUTTON_TEXT;
  dropdownButton.onclick = () => showSettings();

  dropdownContent.className = 'dmfl-dropdown-content';

  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(dropdownContent);

  const data = Object.create(null);

  data.node = node;
  data.photoId = photoId;
  data.photoURL = photoURL;
  data.scheme = scheme;
  data.author = author;
  data.isAnchor = isAnchor;
  data.isImage = isImage;
  data.isMainPhoto = isMainPhoto;
  data.isMainPageEngagement = isMainPageEngagement;
  data.isLightboxEngagement = isLightboxEngagement;

  data.dropdownButton = dropdownButton;
  data.dropdownContent = dropdownContent;
  data.dropdownContainer = dropdownContainer;

  const dmflNodes = [dropdownContainer, dropdownButton, dropdownContent];

  if (isMainPageEngagement) {
    dmflNodes.forEach(n => {
      n.classList.add('dmfl-main-photo-page');
      n.classList.add('dmfl-engagement-view');
    });
    const dlButton = node.getElementsByClassName('download')[0];
    if (o.REPLACE_FLICKR_DL_BUTTON && dlButton) {
      node.replaceChild(dropdownContainer, dlButton);
    } else {
      node.appendChild(dropdownContainer);
    }
    if (!o.IMMEDIATE) {
      dropdownContainer.onmouseenter = () => populate(data);
    }
  } else if (isLightboxEngagement) {
    const onEnter = (e) => {
      if (!o.IMMEDIATE) populate(data);
      const footer = document.getElementsByClassName('foot-overlay')[0];
      if (footer && !lightboxIntervalID) {
        console.debug('[lightbox] starting interval');
        lightboxIntervalID = setInterval(() => {
          if (footer?.isConnected) {
            footer.dispatchEvent(new MouseEvent('mousemove', {"bubbles": true}));
          }
        }, 500)
      }
    }
    const onLeave = (e) => {
      if (!lightboxIntervalID || isDropdownElement(e.relatedTarget)) return;
      console.debug('[lightbox] clearing interval');
      clearInterval(lightboxIntervalID);
      lightboxIntervalID = null;
    }
    dropdownContainer.onmouseenter = onEnter;
    dmflNodes.forEach(n => {
      n.classList.add('dmfl-lightbox-page');
      n.classList.add('dmfl-engagement-view');
      n.onmouseleave = onLeave;
    });
    node.appendChild(dropdownContainer);
  } else if (isAnchor || isImage) {
    // Thumbnails, main photo, discussions page images
    dmflNodes.forEach(n => n.classList.add('dmfl-thumbnail'));
  }

  nodesProcessed.set(node, data);
  console.debug(`Created dropdown for nodeName ${node.nodeName} | class ${node.className} | nodesProcessed: ${nodesProcessed.size}`);

  if (o.IMMEDIATE) {
    setTimeout(() => { /* Don't want to keep the observer busy for _too_ long */
      populate(data);
    }, 200);
  }

}


function handleKeydown(e) {

  if (!PreviewMode.active ||
      !o.KEYBINDINGS[e.keyCode] ||
      !o.KEYBINDINGS[e.keyCode].data.modifierKeys.every(modKey => e[modKey] === true)
     ) return;

  e.preventDefault();
  e.stopPropagation();
  const setting = o.KEYBINDINGS[e.keyCode].setting;

  switch (setting) {
    case "PREVIEW_MODE_ROTATE_CW_KB":
      PreviewMode.rotate(90);
      break;
    case "PREVIEW_MODE_ROTATE_CCW_KB":
      PreviewMode.rotate(-90);
      break;
    case "PREVIEW_MODE_ZOOM_IN_KB":
      PreviewMode.scale(PreviewMode.zoomFactor);
      break;
    case "PREVIEW_MODE_ZOOM_OUT_KB":
      PreviewMode.scale(-PreviewMode.zoomFactor);
      break;
    case "PREVIEW_MODE_TOGGLE_FIT_KB":
      PreviewMode.toggleFit();
      break;
    case "PREVIEW_MODE_EXIT_KB":
      PreviewMode.exit();
      break;
  }

}


function handleMouse(e) {


  if (isDropdownElement(e.target) || isLightboxPage) return;


  if (e.type == "mouseenter") {

    let target = e.target;

    if (!o.MAIN_PHOTO_ENGAGEMENT_VIEW &&
        mainPhoto &&
        mainPhoto.isConnected &&
        /(photo-notes-scrappy-view|facade-of-protection-neue)/.test(target.className)
       ) {
      target = mainPhoto;
    }

    if (MouseTarget.t == target) return;

    const data = nodesProcessed.get(target);
    if (!data || (o.MAIN_PHOTO_ENGAGEMENT_VIEW && data.isMainPageEngagement)) return;

    // New target acquired, clear the old target and track the new target
    dropdownHide();
    MouseTarget.clear();
    MouseTarget.set(data);

  } else if (e.type == "mousemove") {

    if (!MouseTarget.t) return;

    if (!MouseTarget.rect.x ||
        !MouseTarget.rect.y ||
        (lastScrollY != null && (lastScrollY != scrollY || lastScrollX != scrollX))
       ) {
      MouseTarget.updateRect();
    }

    lastScrollX = window.scrollX;
    lastScrollY = window.scrollY;

    if (!overlayContainer.children.length && MouseTarget.isHovered(e)) {
      dropdownShow();
      populate(MouseTarget.data);
    } else if (overlayContainer.children.length && !MouseTarget.isHovered(e)) {
      dropdownHide();
      MouseTarget.clear();
    }

  }


}


const TARGET_NODES = [
  'img.main-photo',
  'td#GoodStuff span.photo_container a img', /* old theme */
  'div.photo-list-view .photo-container a', /* galleries */
  'div.photo-list-view a.overlay', /* common thumbnail */
  'div.photo-list-view a.photo-link', /* new albums layout */
  'div.photo-list-tile-view > a', /* search page tile view */
  'div.group-discussion-topic-view div.message-text a img', /* discussions page images */
  'div.photo-content-upper-container .photo-engagement-view', /* main photo page engagement */
  'div.photo-page-lightbox-scrappy-view .photo-card-engagement', /* lightbox page engagement */
].join(",");


function checkBody() {
  // Detect page changes and clear our states
  const rootview = document.body.getElementsByClassName('flickr-view-root-view')[0];
  if (rootview && (lastURL != document.URL) && (lastRootView != rootview || !rootview.isConnected)) {
    if (lastURL) {
      console.debug('Rootview changed.');
      dropdownHide();
      MouseTarget.clear();
      nodesProcessed.forEach((_, node) => {
        if (!node.isConnected) nodesProcessed.delete(node);
      });
      PreviewMode.clear();
    }
    lastRootView = rootview;
    lastURL = document.URL;
  }

  // Update dropdown position if document size changes
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollWidth = document.documentElement.scrollWidth;
  if (scrollHeight != lastScrollHeight || scrollWidth != lastScrollWidth) {
    if (overlayContainer.children.length && MouseTarget.t) {
      MouseTarget.setPos(overlayContainer.children[0]);
    }
    lastScrollHeight = scrollHeight;
    lastScrollWidth = scrollWidth;
  }

  // Determine specific contexts
  mainPhoto = document.getElementsByClassName('main-photo')[0];
  isLightboxPage = isLightboxURL(document.URL);

  // Scan for newly added nodes
  document.body.querySelectorAll(TARGET_NODES).forEach(node => {
    if (!nodesProcessed.has(node) && !nodesBlacklisted.has(node)) processNode(node);
  });
}

async function appInit() {
  let retryCount = 0;
  if (typeof unsafeWindow !== undefined) {
    while (!appInitOk) {
      if (!unsafeWindow.appContext?.getModel) {
        retryCount++;
        console.log(`Waiting for YUI appContext... (Retry ${retryCount}/10)`);
        if (retryCount == 10 || document.body.querySelector?.('div#Main')) break;
        await sleep(1000);
      } else {
        appInitOk = true;
      }
    }
  }
  if (!appInitOk) {
    console.log("YUI failed to init. Running in xhr mode.");
  } else {
    console.log("YUI app ready.");
  }
  appInitComplete = true;
}

async function pageContentInit() {
  let retryCount = 0;
  while (!pageContent) {
    retryCount++;
    if (retryCount == 150) break;
    pageContent = document.querySelector('div#content') || document.querySelector('div#Main');
    await sleep(100);
  }
}


(async () => {
  console.log('Waiting for page content.');
  await pageContentInit();
  if (pageContent) {
    console.log('Page content ready.');
  } else {
    console.log('Page content not available');
    return;
  }

  GM_registerMenuCommand('Settings', showSettings);

  const sl = document.createElement('div');
  sl.className = 'dmfl-startup-loader';
  sl.textContent = BUTTON_TEXT;
  document.body.appendChild(sl);

  console.log('Starting observer.');
  const observer = new MutationObserver(checkBody);
  observer.observe(pageContent, { childList: true, subtree: true });

  console.log('Adding styles.');
  GM_addStyle(STYLE);

  overlayContainer = document.createElement('div');
  overlayContainer.className = 'dmfl-overlay-container';
  overlayContainer.style.display = 'none';
  document.body.appendChild(overlayContainer);

  messageContainerTopleft = document.createElement('div');
  messageContainerTopleft.className = 'dmfl-message-container dmfl-message-container-topleft';
  document.body.appendChild(messageContainerTopleft);

  messageContainerBottom = document.createElement('div');
  messageContainerBottom.className = 'dmfl-message-container dmfl-message-container-bottom';
  document.body.appendChild(messageContainerBottom);

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('mousemove', handleMouse, false);
  document.addEventListener('mouseenter', handleMouse, true);

  await appInit();
  sl.remove();
})();
