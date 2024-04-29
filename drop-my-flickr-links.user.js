// ==UserScript==
// @name        Drop My Flickr Links!
// @namespace   https://github.com/stanleyqubit/drop-my-flickr-links
// @license     MIT License
// @compatible  firefox Tampermonkey with UserScripts API Dynamic
// @compatible  chrome Violentmonkey or Tampermonkey
// @match       *://*.flickr.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_download
// @grant       GM_registerMenuCommand
// @version     1.0
// @icon        https://www.google.com/s2/favicons?sz=64&domain=flickr.com
// @description Creates a hoverable dropdown menu that shows links to all available sizes for Flickr photos.
// ==/UserScript==


console.log("Loaded.");


const defaultSettings = {
  IMMEDIATE: {
    value: true,
    name: 'Immediate',
    desc: 'On: get sizes for all photos as soon as they appear inside a page. ' +
          'Off: only get sizes on button hover.',
  },
  USE_CACHE: {
    value: true,
    name: 'Use cache',
    desc: 'Get sizes once for each photo and remember them for the current session ' +
          '(until page reload).',
  },
  REPLACE_FLICKR_DL_BUTTON: {
    value: false,
    name: 'Replace Flickr download button',
    desc: 'Whether to replace the Flickr download button shown in the main photo page ' +
          'with our button.',
  },
  PREPEND_AUTHOR_ID: {
    value: true,
    name: 'Prepend author ID to downloaded image file name',
    desc: 'Self-explanatory.',
  },
  UPDATE_INTERVAL: {
    value: 2000,
    name: 'Update interval',
    desc: 'Time interval (in milliseconds) at which scanning and processing for relevant nodes should be done. ' +
          'Used for the timeout function in the main script loop. Smaller values translate to faster processing ' +
          'and a higher workload, while the opposite applies for larger values. Recommended values should be in ' +
          'the range 500 - 2000.',
  },

  /* Dropdown "button" base appearance */

  BUTTON_WIDTH: {
    value: '25px',
    name: 'Button width',
    desc: 'CSS value.',
  },
  BUTTON_HEIGHT: {
    value: '25px',
    name: 'Button height',
    desc: 'CSS value.',
  },
  BUTTON_TEXT_SIZE: {
    value: '16px',
    name: 'Button text size',
    desc: 'CSS value.',
  },
  BUTTON_HOVER_OPACITY: {
    value: '0.85',
    name: 'Button opacity on hover',
    desc: 'CSS value.',
  },
  BUTTON_HOVER_BG_COLOR: {
    value: '#519c60',
    name: 'Button background color on hover',
    desc: 'CSS value.',
  },

  /* Dropdown "button" appearance in main photo page, lightbox */

  BUTTON_TEXT: {
    value: 'D',
    name: 'Button text main',
    desc: 'Text to be shown inside the button if not placed inside a thumbnail. ' +
          '(e.g. in main photo page, lightbox view)',
  },
  BUTTON_TEXT_COLOR: {
    value: '#ffffff',
    name: 'Button text color main',
    desc: 'CSS value.',
  },
  BUTTON_BG_COLOR: {
    value: '#6495ed',
    name: 'Button background color main',
    desc: 'CSS value.',
  },
  BUTTON_OPACITY: {
    value: '1',
    name: 'Button opacity main',
    desc: 'CSS value.',
  },
  BUTTON_JUSTIFY: {
    value: 'center',
    name: 'Button justify content main',
    desc: 'CSS value.',
  },
  BUTTON_ALIGN: {
    value: 'center',
    name: 'Button align items main',
    desc: 'CSS value.',
  },

  /* Dropdown "button" appearance on thumbnails */

  BUTTON_TEXT_ON_THUMBNAIL: {
    value: '. . .',
    name: 'Button text on thumbnail',
    desc: 'Text to be shown inside the button if placed inside a thumbnail. ' +
          '(e.g. in photostream page, etc)',
  },
  BUTTON_TEXT_COLOR_ON_THUMBNAIL: {
    value: '#ffffff',
    name: 'Button text color on thumbnail',
    desc: 'CSS value.',
  },
  BUTTON_BG_COLOR_ON_THUMBNAIL: {
    value: 'transparent',
    name: 'Button background color on thumbnail',
    desc: 'CSS value.',
  },
  BUTTON_OPACITY_ON_THUMBNAIL: {
    value: '0.7',
    name: 'Button opacity on thumbnail',
    desc: 'CSS value.',
  },
  BUTTON_JUSTIFY_ON_THUMBNAIL: {
    value: 'center',
    name: 'Button justify content on thumbnail',
    desc: 'CSS value.',
  },
  BUTTON_ALIGN_ON_THUMBNAIL: {
    value: 'center',
    name: 'Button align items on thumbnail',
    desc: 'CSS value.',
  },

  /* Dropdown menu content appearance */

  CONTENT_BG_COLOR: {
    value: '#f1f1f1',
    name: 'Menu content background color',
    desc: 'CSS value.',
  },
  CONTENT_A_TEXT_COLOR: {
    value: '#000000',
    name: 'Menu content text color',
    desc: 'CSS value.',
  },
  CONTENT_A_TEXT_SIZE: {
    value: '18px',
    name: 'Menu content text size',
    desc: 'CSS value.',
  },
  CONTENT_A_HOVER_BG_COLOR: {
    value: '#dddddd',
    name: 'Menu content anchor element background color on hover',
    desc: 'CSS value.',
  },
}


const getSettingValue = (key, settings) => {
  const value = settings[key]?.value;
  const defaultValue = defaultSettings[key].value;
  return (typeof value === typeof defaultValue) ? value : defaultValue;
}

const storedSettings = GM_getValue('settings', {});
const o = {};

for (const key in defaultSettings) {
  o[key] = getSettingValue(key, storedSettings);
}

const nodesProcessed = new Set();
const nodesPopulated = new Set();
const cache = Object.create(null);


async function appGetInfo(photoId) {
  const appContext = unsafeWindow?.appContext;
  if (appContext && appContext.modelRegistries?.['photo-models']) {
    try {
      const info = await appContext.getModel?.('photo-models', photoId);
      if (info) {
        console.debug('Got info from app');
        return info;
      }
    } catch {
      // returns undefined if await fails
    }
  }
};

async function fetchSizes(photoURL) {
  console.debug('Fetching', photoURL);
  try {
    const p = await fetch(photoURL);
    const html = await p.text();
    const match = html.match(/descendingSizes":(\[.+?\])/);
    const s = match?.[1];
    if (s) {
      console.debug('Got info from fetch');
      return JSON.parse(s);
    } else {
      console.log("No regex match at photo url:", photoURL);
    }
  } catch (error) {
    console.log("Fetch sizes failed with error:", error);
  }
};

async function populate(dropdownContent, href, nodeId) {
  if (nodesPopulated.has(nodeId)) return;
  nodesPopulated.add(nodeId);

  const photoId = href.split('/')[5];
  const photoURL = href.split('/').slice(0, 6).join('/');
  const authorFromURL = href.split('/')[4];

  let descendingSizes, appInfo;
  if (cache[photoId]) {
    console.debug('Got info from cache');
    descendingSizes = cache[photoId].descendingSizes;
  } else {
    appInfo = await appGetInfo(photoId);
    descendingSizes = appInfo?.getValue?.('descendingSizes') || await fetchSizes(photoURL);
  }

  if (!Array.isArray(descendingSizes)) {
    console.log(`No sizes found for photo id ${photoId}.`, {descendingSizes});
    return;
  }

  //const owner = appInfo?.getValue?.('owner');
  //const ownerId = owner?.getValue?.('id') || owner?.getValue?.('nsid') || owner?.getValue?.('url')?.split('/')[2];
  const author = authorFromURL;

  if (o.USE_CACHE && !cache[photoId]) {
    console.debug('Adding to cache:', photoId);
    cache[photoId] = {'descendingSizes': descendingSizes};
  }

  for (const item of descendingSizes) {
    const imageUrl = item.url || item.src || item.displayUrl;
    const filename = imageUrl.split('/').pop();
    const extension = filename.split('.').pop();
    const anchor = document.createElement('a');
    const downloadURL = imageUrl.replace(/(\.[a-z]+)$/i, '_d$1');
    anchor.setAttribute('href', imageUrl);
    anchor.textContent = `${item.width} x ${item.height} (${item.key})`;
    if (!extension.endsWith('jpg')) {
      anchor.textContent += ` [${extension}]`;
    }
    const downloadFilename = o.PREPEND_AUTHOR_ID ? `${author}_-_${filename}` : filename;
    anchor.addEventListener('click', (event) => {
      GM_download(downloadURL, downloadFilename);
      event.preventDefault();
    })
    dropdownContent.appendChild(anchor);
  }
}

function processNode(node) {

  const nodeId = node.getAttribute('id');

  if (nodesProcessed.has(nodeId) || node.querySelector('div.dmfl-dropdown-container')) return;

  const hasEngagementView = node.classList.contains('photo-engagement-view');
  const isMainPhotoPage = node.classList.contains('sub-photo-view') || hasEngagementView;
  const isLightbox = node.classList.contains('photo-card-engagement-view');

  const href = isMainPhotoPage || isLightbox ? document.URL : node.querySelector('a.overlay')?.href || node.querySelector('a')?.href;
  if (!href || href.indexOf('/photos/') < 0) {
    console.debug(`(ignore) No valid href at ${document.URL} for node with className "${node.className}", href: ${href}`);
    return;
  }

  const dropdownContainer = document.createElement('div');
  const dropdownButton = document.createElement('div');
  const dropdownContent = document.createElement('div');
  dropdownContainer.className = 'dmfl-dropdown-container';
  dropdownButton.className = 'dmfl-dropdown-button';
  dropdownButton.textContent = o.BUTTON_TEXT;
  dropdownButton.onclick = () => { showSettings() };
  dropdownContent.className = 'dmfl-dropdown-content';
  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(dropdownContent);

  const mflNodes = [dropdownContainer, dropdownButton, dropdownContent];

  if (isMainPhotoPage) {
    const flickrDlButton = node.querySelector('.engagement-item.download');
    if (!flickrDlButton) {
      console.debug("Waiting for Flickr download button...");
      return;
    }
    mflNodes.forEach(n => n.classList.add('dmfl-main-photo-page'));
    if (o.REPLACE_FLICKR_DL_BUTTON) {
      node.replaceChild(dropdownContainer, flickrDlButton);
    } else {
      node.appendChild(dropdownContainer);
    }
  } else if (isLightbox) {
    const lightboxEngagement = node.querySelector('.photo-card-engagement');
    if (!lightboxEngagement) {
      console.debug("Waiting for lightbox photo card engagement...");
      return;
    }
    mflNodes.forEach(n => n.classList.add('dmfl-lightbox-page'));
    lightboxEngagement.appendChild(dropdownContainer);
  } else {
    // Photostream, albums, faves, galleries, search page, explore page
    mflNodes.forEach(n => n.classList.add('dmfl-thumbnail-page'));
    dropdownButton.textContent = o.BUTTON_TEXT_ON_THUMBNAIL;
    node.insertBefore(dropdownContainer, node.firstChild);
  }

  if (o.IMMEDIATE) {
    populate(dropdownContent, href, nodeId);
  }

  const zIndexDefault = node.style.getPropertyValue('z-index');
  let mouseEnterCount = 0;

  dropdownContainer.addEventListener("mouseenter", () => {
    mouseEnterCount += 1;
    node.style.zIndex = '9999';
    if (mouseEnterCount > 1 || dropdownContent.querySelectorAll('a').length > 0) return;
    populate(dropdownContent, href, nodeId);
  });

  dropdownContainer.addEventListener("mouseleave", () => {
    node.style.zIndex = zIndexDefault;
  });

  nodesProcessed.add(nodeId);
}


const style = `
  /*
   =================
  | Dropdown widget |
   =================
  */

  .dmfl-dropdown-container {
    z-index: 10000;
    cursor: pointer;
  }

  .dmfl-dropdown-button {
    display: flex;
    font-size: ${o.BUTTON_TEXT_SIZE};
    width: ${o.BUTTON_WIDTH};
    height: ${o.BUTTON_HEIGHT};
    z-index: 10002 !important;
    border: none;
  }

  .dmfl-dropdown-content {
    display: none;
    z-index: 10003 !important;
    width: max-content;
    height: max-content;
    background-color: ${o.CONTENT_BG_COLOR};
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  }

  .dmfl-dropdown-content a {
    display: block;
    color: ${o.CONTENT_A_TEXT_COLOR};
    z-index: 10004 !important;
    padding: 3px 3px;
    font-size: ${o.CONTENT_A_TEXT_SIZE};
    text-decoration: none;
  }

  .dmfl-dropdown-content a:hover {
    background-color: ${o.CONTENT_A_HOVER_BG_COLOR};
  }

  .dmfl-dropdown-container:hover .dmfl-dropdown-content {
    display: inline-block;
  }

  .dmfl-dropdown-container:hover .dmfl-dropdown-button {
    background-color: ${o.BUTTON_HOVER_BG_COLOR};
    opacity: ${o.BUTTON_HOVER_OPACITY};
  }

  .dmfl-dropdown-container.dmfl-thumbnail-page {
    position: absolute;
    display: inline-block;
    width: max-content;
    height: max-content;
    padding: 3px;
  }

  .dmfl-dropdown-button.dmfl-thumbnail-page {
    position: relative;
    justify-content: ${o.BUTTON_JUSTIFY_ON_THUMBNAIL};
    align-items: ${o.BUTTON_ALIGN_ON_THUMBNAIL};
    color: ${o.BUTTON_TEXT_COLOR_ON_THUMBNAIL};
    background-color: ${o.BUTTON_BG_COLOR_ON_THUMBNAIL};
    opacity: ${o.BUTTON_OPACITY_ON_THUMBNAIL};
  }

  .dmfl-dropdown-content.dmfl-thumbnail-page {
    position: relative;
  }

  .dmfl-dropdown-container.dmfl-main-photo-page {
    position: relative;
    display: flex;
    align-items: center;
    margin-right: 12px;
    width: ${o.BUTTON_WIDTH};
    height: ${o.BUTTON_HEIGHT};
  }

  .dmfl-dropdown-button.dmfl-main-photo-page {
    position: absolute;
    justify-content: ${o.BUTTON_JUSTIFY};
    align-items: ${o.BUTTON_ALIGN};
    color: ${o.BUTTON_TEXT_COLOR};
    background-color: ${o.BUTTON_BG_COLOR};
    opacity: ${o.BUTTON_OPACITY};
  }

  .dmfl-dropdown-content.dmfl-main-photo-page {
    position: absolute;
    right: 0;
    bottom: ${o.BUTTON_HEIGHT};
  }

  .dmfl-dropdown-container.dmfl-lightbox-page {
    position: relative;
    display: flex;
    align-items: center;
    width: ${o.BUTTON_WIDTH};
    height: ${o.BUTTON_HEIGHT};
  }

  .dmfl-dropdown-button.dmfl-lightbox-page {
    position: absolute;
    justify-content: ${o.BUTTON_JUSTIFY};
    align-items: ${o.BUTTON_ALIGN};
    color: ${o.BUTTON_TEXT_COLOR};
    background-color: ${o.BUTTON_BG_COLOR};
    opacity: ${o.BUTTON_OPACITY};
  }

  .dmfl-dropdown-content.dmfl-lightbox-page {
    position: absolute;
    right: 0;
    bottom: ${o.BUTTON_HEIGHT};
  }


  /*
   ================
  | Settings modal |
   ================
  */

  .dmfl-modal {
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

  .dmfl-modal-content {
    position: absolute;
    background-color: #fefefe;
    padding: 20px;
    border: 1px solid #888;
    width: 60%;
    height: 80%;
    overflow: auto;
  }

  .dmfl-modal-content h3 {
    padding-left: 5px;
  }

  .dmfl-modal-body {
    overflow: auto;
    height: inherit;
    padding: 5px;
  }

  .dmfl-modal-footer {
    position: absolute;
    bottom: 10px;
  }

  .dmfl-modal-entry {
    display: block;
    margin-bottom: 15px;
    text-align: left;
    width: max-content;
  }

  .dmfl-modal-label {
    position: relative;
    display: inline-block;
  }

  .dmfl-modal-entry input {
    line-height: 1 !important;
    margin-left: 10px;
    vertical-align: middle;
  }

  .dmfl-modal-entry input[type="number"] {
    text-align: center;
    width: 65px;
    padding-block: 2px;
  }

  .dmfl-modal-tooltiptext {
    visibility: hidden;
    width: max-content;
    max-width: 300px;
    background-color: cornflowerblue;
    color: #fff;
    text-align: left;
    border-radius: 6px;
    padding: 10px;

    /* Position the tooltip */
    position: absolute;
    z-index: 1;
    left: calc(100% + 10px);
    top: -5px; /* 5px because the tooltip text has a top and bottom padding of 5px */

    /* Fade in tooltip */
    opacity: 0;
    transition: opacity 0.5s;
  }

  .dmfl-modal-label:hover .dmfl-modal-tooltiptext {
    visibility: visible;
    opacity: 1;
  }

  .dmfl-modal-color-picker {
    display: inline-block;
    margin-bottom: 5px;
  }

  /* The Close Button */
  .dmfl-modal-close {
    color: #aaaaaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
  }

  .dmfl-modal-close:hover,
  .dmfl-modal-close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
  }
`;

console.log('Adding styles.');
GM_addStyle(style);

const modalHTML = `
<form class="dmfl-modal-content">
  <span class="dmfl-modal-close">&times;</span>
  <h3>Drop My Flickr Links!  \u27b2  Settings</h3><br>
  <div class="dmfl-modal-body"></div>
  <div class="dmfl-modal-footer">
    <button class="dmfl-modal-save-button" type="submit" disabled>Save &amp; Reload</button>
    <button class="dmfl-modal-restore-defaults-button">Restore defaults</button>
  </div>
</form>
`

function showSettings() {
  if (document.querySelector(".dmfl-modal")) return;

  const modal = document.createElement("div");
  modal.className = "dmfl-modal";
  modal.innerHTML = modalHTML;
  document.body.appendChild(modal);

  const modalContent = modal.querySelector('.dmfl-modal-content');
  const modalClose = modal.querySelector(".dmfl-modal-close");
  const modalSave = modal.querySelector(".dmfl-modal-save-button");
  const modalRestore = modal.querySelector(".dmfl-modal-restore-defaults-button");
  const modalBody = modal.querySelector(".dmfl-modal-body");
  const tempSettings = GM_getValue('settings', {});

  const fillBody = (settings) => {
    for (const [key, defaultSetting] of Object.entries(defaultSettings)) {
      const entry = document.createElement('div');
      entry.className = 'dmfl-modal-entry';
      const inputElement = document.createElement("input");
      inputElement.className = 'dmfl-modal-input';

      if (!tempSettings[key]) {
        tempSettings[key] = {};
      }

      let valGetter, valSetter;
      if (typeof defaultSetting.value === 'boolean') {
        inputElement.setAttribute('type', 'checkbox');
        valGetter = 'checked';
        valSetter = 'checked';
      } else if (typeof defaultSetting.value === 'number') {
        inputElement.setAttribute('type', 'number');
        inputElement.setAttribute('min', 100);
        inputElement.setAttribute('step', 100);
        inputElement.required = true;
        valGetter = 'valueAsNumber';
        valSetter = 'value';
      } else {
        inputElement.setAttribute('type', 'text');
        valGetter = 'value';
        valSetter = 'value';
      }

      const settingValue = getSettingValue(key, settings);
      inputElement[valSetter] = settingValue;
      tempSettings[key].value = settingValue;

      const label = document.createElement("label");
      label.className = 'dmfl-modal-label';
      label.textContent = defaultSetting.name;

      if (defaultSetting.desc) {
        const tooltipText = document.createElement('span');
        tooltipText.className = 'dmfl-modal-tooltiptext';
        tooltipText.innerText = `${defaultSetting.desc}\n\nDefault: ` +
                                `${String(defaultSetting.value).replace(/^true$/, 'On').replace(/^false$/, 'Off')}`;
        label.style.borderBottom = '1px dotted black';
        label.appendChild(tooltipText);
      }

      entry.appendChild(label);
      entry.appendChild(inputElement);

      let colorPicker;
      if (key.indexOf('_COLOR') >= 0) {
        colorPicker = document.createElement('input');
        colorPicker.className = 'dmfl-modal-color-picker';
        colorPicker.setAttribute('type', 'color');
        colorPicker.value = inputElement.value;
        colorPicker.addEventListener("input", () => {
          inputElement.value = colorPicker.value;
          inputElement.dispatchEvent(new Event('input'));
        })
        entry.appendChild(colorPicker);
      }

      inputElement.addEventListener("input", () => {
        modalSave.disabled = false;
        modalRestore.disabled = false;
        tempSettings[key].value = inputElement[valGetter];
      })
      modalBody.appendChild(entry);
    }
  }

  fillBody(tempSettings);

  modalClose.onclick = function() {
    modal.remove();
  }
  modalRestore.onclick = function() {
    modalBody.innerHTML = '';
    fillBody(defaultSettings);
    modalSave.disabled = false;
    modalRestore.disabled = true;
  }
  modalContent.onsubmit = function() {
    modalSave.disabled = true;
    modalRestore.disabled = true;
    GM_setValue('settings', tempSettings);
  }
}

GM_registerMenuCommand('Settings', showSettings);

const INSERT_LOCATIONS = [
  'div.photo-list-photo-view', /* Thumbnails */
  'div.photo-list-tile-view',
  'div.photo-list-gallery-photo-view',
  'div.photo-card-engagement-view',
  'div.photo-engagement-view', /* Main page, Lighbox page */
].join(', ');


console.log("Starting timer.");

// Ensure that the previous interval has completed before recursing
(function main() {
  setTimeout(() => {
    document.querySelectorAll(INSERT_LOCATIONS).forEach(node => { processNode(node) });
    main();
  }, o.UPDATE_INTERVAL);
})();

