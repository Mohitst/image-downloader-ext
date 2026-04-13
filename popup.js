console.log('Popup loaded successfully');

const urlInput = document.getElementById('url');
const directorySelect = document.getElementById('directory');
const customDirectoryInput = document.getElementById('customDirectory');
const customDirectoryContainer = document.getElementById('customDirectoryContainer');
const browseBtn = document.getElementById('browseBtn');
const previewPath = document.getElementById('previewPath');
const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');
const asZipCheckbox = document.getElementById('asZip');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const pagesFound = document.getElementById('pagesFound');
const imagesFound = document.getElementById('imagesFound');
const currentImage = document.getElementById('currentImage');
const currentPage = document.getElementById('currentPage');

// Load last used settings
chrome.storage.local.get(['lastUrl', 'selectedDirectory', 'customDirectory'], function(result) {
  if (result.lastUrl) {
    urlInput.value = result.lastUrl;
  }
  if (result.selectedDirectory) {
    directorySelect.value = result.selectedDirectory;
  }
  if (result.customDirectory) {
    customDirectoryInput.value = result.customDirectory;
  }
  
  // Initialize container visibility based on saved selection
  setTimeout(() => {
    if (directorySelect.value === 'custom') {
      customDirectoryContainer.classList.add('visible');
      updatePreview();
    } else {
      customDirectoryContainer.classList.remove('visible');
    }
  }, 100);
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}

function hideStatus() {
  statusDiv.style.display = 'none';
}

function showProgress(show) {
  progressDiv.style.display = show ? 'block' : 'none';
}

// Update preview function
function updatePreview() {
  const customDir = customDirectoryInput.value.trim();
  if (customDir) {
    previewPath.textContent = `Downloads/${customDir}/`;
  } else {
    previewPath.textContent = 'Downloads/My Images/';
  }
}

function updateProgress(percentage, text, currentImageName = null, currentPageName = null, pagesCount = 0, imagesCount = 0) {
  progressFill.style.width = percentage + '%';
  
  pagesFound.textContent = pagesCount;
  imagesFound.textContent = imagesCount;
  
  if (currentImageName) {
    currentImage.textContent = `Downloading: ${currentImageName}`;
  } else {
    currentImage.textContent = text;
  }
  
  if (currentPageName) {
    currentPage.textContent = `From: ${currentPageName}`;
  } else {
    currentPage.textContent = '';
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (_) {
    return 'unknown-domain';
  }
}

const startDownload = async () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showStatus('Please enter a URL', 'error');
    return;
  }

  if (!isValidUrl(url)) {
    showStatus('Please enter a valid URL (e.g., https://example.com)', 'error');
    return;
  }

  const selectedDirectory = directorySelect.value;
  const customDirectory = customDirectoryInput.value.trim();
  
  chrome.storage.local.set({ 
    lastUrl: url,
    selectedDirectory: selectedDirectory,
    customDirectory: customDirectory
  });

  startBtn.disabled = true;
  showStatus('Starting image download...', 'info');
  showProgress(true);
  updateProgress(0, 'Initializing...');

  try {
    const downloadOptions = {
      action: 'startDownload',
      url: url,
      domain: getDomainFromUrl(url),
      asZip: asZipCheckbox ? asZipCheckbox.checked : false
    };

    if (selectedDirectory === 'custom' && customDirectory) {
      downloadOptions.customDirectory = customDirectory;
    }

    const response = await chrome.runtime.sendMessage(downloadOptions);

    if (response && response.success) {
      showStatus('Download started successfully!', 'success');
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      showStatus('Error: ' + (response ? response.error : 'No response from background'), 'error');
      startBtn.disabled = false;
      showProgress(false);
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    startBtn.disabled = false;
    showProgress(false);
  }
};

const clearAll = () => {
  urlInput.value = '';
  customDirectoryInput.value = '';
  directorySelect.value = 'default';
  customDirectoryContainer.classList.remove('visible');
  previewPath.textContent = 'Downloads/My Images/';
  hideStatus();
  showProgress(false);
  startBtn.disabled = false;
  chrome.storage.local.remove(['lastUrl', 'selectedDirectory', 'customDirectory']);
};

directorySelect.addEventListener('change', function() {
  if (directorySelect.value === 'custom') {
    customDirectoryContainer.classList.add('visible');
    updatePreview();
  } else {
    customDirectoryContainer.classList.remove('visible');
  }
});

customDirectoryInput.addEventListener('input', updatePreview);

browseBtn.addEventListener('click', function() {
  showStatus('Folder browsing coming soon! Enter folder name manually.', 'info');
  customDirectoryInput.focus();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'progress') {
    updateProgress(
      message.percentage, 
      message.text,
      message.currentImage,
      message.currentPage,
      message.pagesFound,
      message.imagesFound
    );
    if (message.status) {
      showStatus(message.status, 'info');
    }
  } else if (message.type === 'complete') {
    showStatus(`Download complete! ${message.imageCount} images downloaded to Downloads/${message.domain}/`, 'success');
    startBtn.disabled = false;
    showProgress(false);
    setTimeout(() => {
      window.close();
    }, 3000);
  } else if (message.type === 'error') {
    showStatus('Error: ' + message.error, 'error');
    startBtn.disabled = false;
    showProgress(false);
  }
});

startBtn.addEventListener('click', startDownload);
clearBtn.addEventListener('click', clearAll);

urlInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    startDownload();
  }
});
