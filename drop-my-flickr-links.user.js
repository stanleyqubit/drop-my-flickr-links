// ==UserScript==
// @name        Drop My Flickr Links!
// @namespace   https://github.com/stanleyqubit/drop-my-flickr-links
// @license     MIT License
// @author      stanleyqubit
// @compatible  firefox Tampermonkey with UserScripts API Dynamic
// @compatible  chrome Violentmonkey or Tampermonkey
// @match       *://*.flickr.com/*
// @connect     www.flickr.com
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_download
// @grant       GM_openInTab
// @grant       GM_notification
// @grant       GM.xmlHttpRequest
// @grant       GM_registerMenuCommand
// @version     1.5.2
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
const scriptName = "Drop My Flickr Links!";


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
    desc: 'Get sizes once for each photo and remember them for the current ' +
          'session (until page reload).',
  },
  REPLACE_FLICKR_DL_BUTTON: {
    value: false,
    name: 'Replace Flickr download button',
    desc: 'Whether to replace the Flickr download button shown in the main ' +
          'photo page with our button.',
  },
  PREPEND_AUTHOR_ID: {
    value: true,
    name: 'Prepend author ID to downloaded image file name',
    desc: 'Self-explanatory.',
  },
  SHOW_LICENSE_INFO: {
    value: true,
    name: 'Show license information',
    desc: 'Shows a hyperlink to the photo\'s license when in preview mode.',
  },
  UPDATE_INTERVAL: {
    value: 2000,
    name: 'Update interval',
    desc: 'Time interval (in milliseconds) at which scanning and processing ' +
          'for relevant nodes should be done. Used for the timeout function ' +
          'in the main script loop. Smaller values translate to faster ' +
          'processing and a higher workload, while the opposite applies for ' +
          'larger values. Recommended values should be in the range 500 - 2000.',
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
  CONTENT_TEXT_COLOR: {
    value: '#000000',
    name: 'Menu content text color',
    desc: 'CSS value.',
  },
  CONTENT_TEXT_SIZE: {
    value: '18px',
    name: 'Menu content text size',
    desc: 'CSS value.',
  },
  CONTENT_A_HOVER_BG_COLOR: {
    value: '#dddddd',
    name: 'Menu content anchor element background color on hover',
    desc: 'CSS value.',
  },
  CONTENT_DIV_HOVER_BG_COLOR: {
    value: '#5bc4eb',
    name: 'Menu content preview element background color on hover',
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

let appInitOk = false;
let appInitRetryCount = 0;


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


function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  const response = await GM.xmlHttpRequest({
    method: "GET",
    url: photoURL
  }).catch(e => {
    console.log(`${photoId} : xhr error:`, e);
    return;
  });

  const dsMatch = response.responseText?.match(/descendingSizes":(\[.+?\])/);
  const ds = dsMatch?.[1];
  if (ds) {
    const licenseMatch = response.responseText?.match(/"license":(\d+)/);
    const licenseInfo = {"value": licenseMatch?.[1]};
    console.debug(`${photoId} : Got info from xhr`);
    return {"descendingSizes": JSON.parse(ds), "ownerId": response.finalUrl.split('/')[4], "licenseInfo": licenseInfo};
  } else {
    let msg = `${photoId} : No regex match at url ${response.finalUrl}`;
    if (response.finalUrl.endsWith('///')) msg += ' (photo not found)';
    if (response.responseText.match(/This photo is private/)) msg += ' (photo is private)';
    if (response.status != 200) msg += ` [status: ${response.status}]`;
    console.log(msg);
  }
}

function dl(downloadURL, downloadFilename) {
  let download;
  const checkStatus = (responseObject) => {
    const status = responseObject.status;
    if (/^[045]/.test(status)) /* Violentmonkey */ {
      download.abort();
      console.warn('Download failed.', {responseObject});
      GM_notification(`URL: ${downloadURL}\n\nDownload failed with status code: ${status}`, scriptName);
    }
    if (responseObject.error) /* Tampermonkey */ {
      const msg = `URL: ${downloadURL}\n\nDownload error: ${responseObject.error}`;
      console.warn(msg);
      GM_notification(msg, scriptName);
    }
  };
  download = GM_download({
    url: downloadURL,
    name: downloadFilename,
    onprogress: (res) => { checkStatus(res) },
    onerror: (res) => { checkStatus(res) },
  });
}

async function populate(data) {
  if (nodesPopulated.has(data.node)) return;
  nodesPopulated.add(data.node);

  /* First try to get sizes info from the YUI `appContext` global variable.
   * Some of this object's methods might not be available as the UserScripts API
   * implementation may differ across userscript managers. For Chromium-based web
   * browsers this shouldn't be an issue. However, if the YUI module is not
   * available, a xhr will be sent as a fallback.
   *
   * Also, see note at the top of the file. */

  const photoId = data.photoId;
  const photoURL = data.photoURL;

  const info = cache[photoId] || await appGetInfo(photoId) || await xhrGetInfo(photoId, photoURL);
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
    let failMessage = `${photoId} : No sizes found.`;
    if (info?.message) {
      failMessage += ` YUI said: ${info.message}`;
    }
    console.log(failMessage);
    if (data.isImage) {
      console.log(`${photoId} : Adding image src as sole entry.`);
      const imageData = Object.create(null);
      imageData.src = data.node.src;
      imageData.width = data.node.getAttribute('width');
      imageData.height = data.node.getAttribute('height');
      imageData.key = '?';
      descendingSizes = [imageData];
    } else {
      return;
    }
  }

  if (o.USE_CACHE && !cache[photoId]) {
    cache[photoId] = {'descendingSizes': descendingSizes, 'ownerId': author, 'licenseInfo': licenseInfo};
  }

  for (const item of descendingSizes) {
    const imageURL = item.url || item.src || item.displayUrl;
    if (!imageURL) {
      console.log("descendingSizes item has no url");
      continue;
    }
    const filename = imageURL.split('/').pop();
    const extension = filename.split('.').pop();
    const entry = document.createElement('div');
    entry.className = 'dmfl-dropdown-entry';
    const anchor = document.createElement('a');
    let downloadURL = '';
    if (imageURL.startsWith('//')) {
      downloadURL += data.scheme;
    }
    downloadURL += imageURL.replace(/(\.[a-z]+)$/i, '_d$1');
    anchor.setAttribute('href', imageURL);
    anchor.textContent = `${item.width} x ${item.height} (${item.key})`;
    if (!extension.endsWith('jpg')) {
      anchor.textContent += ` [${extension}]`;
    }
    const downloadFilename = author && o.PREPEND_AUTHOR_ID ? `${author}_-_${filename}` : filename;
    anchor.addEventListener('click', (event) => {
      dl(downloadURL, downloadFilename);
      event.preventDefault();
    })
    entry.appendChild(anchor);
    const previewContainer = document.createElement('div');
    previewContainer.className = 'dmfl-preview-container';
    previewContainer.textContent = '[ + ]';
    previewContainer.addEventListener('click', () => {
      const previewBg = document.createElement('div');
      previewBg.className = 'dmfl-preview-background';
      const previewDl = document.createElement('a');
      previewDl.className = 'dmfl-preview-download';
      previewDl.innerText = '\u21e3';
      previewDl.addEventListener('click', (event) => {
        dl(downloadURL, downloadFilename);
        event.preventDefault();
      })
      previewBg.appendChild(previewDl);
      if (licenseInfo) {
        const previewLicenseInfo = document.createElement('a');
        previewLicenseInfo.className = 'dmfl-preview-license-info';
        previewLicenseInfo.setAttribute('href', licenseInfo.url);
        previewLicenseInfo.innerText = `License: ${licenseInfo.text}`;
        previewLicenseInfo.addEventListener('click', (event) => {
          GM_openInTab(previewLicenseInfo.href, false);
          event.preventDefault();
          event.stopPropagation();
        })
        previewBg.appendChild(previewLicenseInfo);
      }
      const previewImg = document.createElement('img');
      previewImg.className = 'dmfl-preview-image';
      previewImg.src = imageURL;
      previewBg.onclick = () => { previewBg.remove() };
      previewBg.appendChild(previewImg);
      document.body.appendChild(previewBg);
    })
    entry.appendChild(previewContainer);
    data.dropdownContent.appendChild(entry);
  }
}

function processNode(node) {

  const hasEngagementView = node.classList.contains('photo-engagement-view');
  const isMainPhotoPage = node.classList.contains('sub-photo-view') || hasEngagementView;
  const isLightbox = node.classList.contains('photo-card-engagement-view');
  const isDiscussionsPage = node.closest('div[class="message-text"]') !== null;

  const href = isMainPhotoPage || isLightbox ? document.URL :
             isDiscussionsPage ? node.parentNode?.href :
             node.querySelector('a.overlay')?.href || node.querySelector('a')?.href;

  if (!href) {
    /* Anchor elements aren't always available immediately.
     * Wait for page scripts to add relevant nodes. */
    return;
  }

  const photoIsLocked = (href.indexOf('flickr.com/gp/') >= 0);
  const photoIsUnlocked = (href.indexOf('flickr.com/photos/') >= 0);

  if (!photoIsLocked && !photoIsUnlocked) {
    console.debug(`(ignore) No valid href at ${document.URL} for node with className "${node.className}", href: ${href}`);
    if (isDiscussionsPage) nodesProcessed.add(node);
    return;
  }

  if (isDiscussionsPage && /\/(albums|groups|galleries)\//.test(href)) {
    nodesProcessed.add(node);
    return;
  }

  const isImage = (node.nodeName === 'IMG');
  if (isImage) {
    if (!node.src || node.src.indexOf('static') < 0) return; // Image sources might be added dynamically
    if (!/(live|farm[\d]*)\.static\.?flickr\.com\/[\d]+\/[\d]+_[a-z0-9]+(_[a-z0-9]{1,2})?\.[a-z0-9]{3,4}$/.test(node.src)) {
      console.debug(`Not a valid image source "${node.src}"`, node);
      nodesProcessed.add(node);
      return;
    }
  }

  const components = href.split('/');
  const scheme = components[0];
  const author = components[4];
  const photoId = isImage ? node.src.split('/').pop().split('_')[0] : components[5];

  if (!photoId) {
    console.debug("No photo ID found while processing node", node);
    nodesProcessed.add(node);
    return;
  }

  if (!photoIsLocked && isNaN(Number(photoId))) {
    console.debug(`Not a valid photoId "${photoId}"`, node);
    nodesProcessed.add(node);
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
  dropdownButton.textContent = o.BUTTON_TEXT;
  dropdownButton.onclick = () => { showSettings() };
  dropdownContent.className = 'dmfl-dropdown-content';
  dropdownContainer.appendChild(dropdownButton);
  dropdownContainer.appendChild(dropdownContent);

  const dmflNodes = [dropdownContainer, dropdownButton, dropdownContent];

  if (isMainPhotoPage) {
    const flickrDlButton = node.querySelector('.engagement-item.download');
    if (!flickrDlButton) {
      console.debug("Waiting for Flickr download button...");
      return;
    }
    dmflNodes.forEach(n => n.classList.add('dmfl-main-photo-page'));
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
    dmflNodes.forEach(n => n.classList.add('dmfl-lightbox-page'));
    lightboxEngagement.appendChild(dropdownContainer);
  } else if (isDiscussionsPage) {
    const imgAnchor = node.parentNode;
    const closestDiv = imgAnchor.closest('div');
    let photoContainer = imgAnchor;
    if (imgAnchor.parentNode.classList.contains('photo_container')) {
      photoContainer = closestDiv;
    }
    const discContainer = document.createElement('div');
    discContainer.className = 'dmfl-disc-container';
    discContainer.appendChild(dropdownContainer);
    dmflNodes.forEach(n => n.classList.add('dmfl-thumbnail-page'));
    dropdownButton.textContent = o.BUTTON_TEXT_ON_THUMBNAIL;
    photoContainer.parentNode.insertBefore(discContainer, photoContainer);
    discContainer.appendChild(photoContainer);
  } else {
    // Photostream, albums, faves, galleries, search page, explore page
    dmflNodes.forEach(n => n.classList.add('dmfl-thumbnail-page'));
    dropdownButton.textContent = o.BUTTON_TEXT_ON_THUMBNAIL;
    node.insertBefore(dropdownContainer, node.firstChild);
  }

  const data = Object.create(null);
  data.node = node;
  data.scheme = scheme;
  data.author = author;
  data.isImage = isImage;
  data.photoId = photoId;
  data.photoURL = photoURL;
  data.dropdownContent = dropdownContent;

  if (o.IMMEDIATE) {
    populate(data);
  }

  const zIndexDefault = node.style.getPropertyValue('z-index');
  let mouseEnterCount = 0;

  dropdownContainer.addEventListener("mouseenter", () => {
    mouseEnterCount += 1;
    node.style.zIndex = '9999';
    if (mouseEnterCount > 1 || dropdownContent.querySelectorAll('a').length > 0) return;
    populate(data);
  });

  dropdownContainer.addEventListener("mouseleave", () => {
    node.style.zIndex = zIndexDefault;
  });

  nodesProcessed.add(node);
}


const STYLE = `
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
    z-index: 10002;
    border: none;
  }

  .dmfl-dropdown-content {
    display: none;
    z-index: 10003;
    width: max-content;
    height: max-content;
    background-color: ${o.CONTENT_BG_COLOR};
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    font-size: ${o.CONTENT_TEXT_SIZE};
    text-decoration: none;
  }

  .dmfl-dropdown-entry {
    z-index: 10004;
    padding: 3px 3px;
  }

  .dmfl-dropdown-content a {
    display: inline-block !important;
    color: ${o.CONTENT_TEXT_COLOR};
  }

  .dmfl-dropdown-content div.dmfl-preview-container {
    display: inline-block;
    color: ${o.CONTENT_TEXT_COLOR};
    margin-left: 10px;
    margin-right: 5px;
  }

  .dmfl-dropdown-content div.dmfl-preview-container:hover {
    background-color: ${o.CONTENT_DIV_HOVER_BG_COLOR};
    opacity: .9;
  }

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
  }

  .dmfl-preview-image {
    max-width: 100vw;
    max-height: 100vh;
    object-fit: cover;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .dmfl-preview-download {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 30px;
    height: 40px;
    width: 40px;
    color: honeydew !important;
    background-color: ${o.BUTTON_BG_COLOR};
    position: fixed;
    z-index: 30001;
    right: 20px;
    bottom: 20px;
  }

  .dmfl-preview-license-info {
    display: flex;
    color: honeydew !important;
    position: fixed;
    z-index: 30001;
    left: 20px;
    bottom: 20px;
  }

  .dmfl-dropdown-content a:hover {
    background-color: ${o.CONTENT_A_HOVER_BG_COLOR};
  }

  .dmfl-dropdown-container:hover .dmfl-dropdown-content {
    display: block;
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

  .dmfl-disc-container {
    position: relative;
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


const modalHTML = `
<form class="dmfl-modal-content" method="dialog">
  <span class="dmfl-modal-close">&times;</span>
  <h3>${scriptName}  \u27b2  Settings</h3><br>
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

      if (key.indexOf('_COLOR') >= 0) {
        const colorPicker = document.createElement('input');
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
    window.location.reload();
  }
}

GM_registerMenuCommand('Settings', showSettings);

const INSERT_LOCATIONS = [
  'div.photo-list-photo-view', /* Thumbnails */
  'div.photo-list-tile-view',
  'div.photo-list-gallery-photo-view',
  'div.photo-list-description-view',
  'div.photo-list-view > .photo-card-view',
  'div.foot-overlay .photo-card-engagement-view', /* Lightbox page */
  'div.photo-content-upper-container .photo-engagement-view', /* Main page */
  'div.group-discussion-topic-view .message-text img', /* Discussions page */
].join(', ');


// Ensure that the previous interval has completed before recursing
function main() {
  setTimeout(() => {
    document.querySelectorAll(INSERT_LOCATIONS).forEach(node => {
      if (!nodesProcessed.has(node)) processNode(node);
    });
    main();
  }, o.UPDATE_INTERVAL);
}


async function appInit() {
  if (typeof unsafeWindow !== undefined) {
    while (!appInitOk) {
      if (!unsafeWindow.appContext?.getModel) {
        appInitRetryCount++;
        if (appInitRetryCount == 10) break;
        console.log("Waiting for YUI appContext...");
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
}

(async () => {
  await appInit();
  console.log('Adding styles.');
  GM_addStyle(STYLE);
  console.log("Starting timer.");
  main();
})();
