// Content script for extracting images and links from pages
class PageExtractor {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'extractImages') {
        const images = this.extractImages();
        sendResponse({ images: images });
      } else if (message.action === 'extractLinks') {
        const links = this.extractLinks(message.baseUrl);
        sendResponse({ links: links });
      }
    });
  }

  extractImages() {
    const images = [];
    const elements = document.querySelectorAll('img[src]');
    
    elements.forEach(img => {
      const src = img.src || img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        try {
          const url = new URL(src, window.location.href);
          const filename = this.getFilenameFromUrl(url.href) || `image_${Date.now()}.jpg`;
          
          images.push({
            url: url.href,
            filename: filename,
            alt: img.alt || '',
            title: img.title || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height
          });
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    // Also check for images in picture elements and background images
    this.extractPictureImages(images);
    this.extractBackgroundImages(images);
    
    return images;
  }

  extractPictureImages(images) {
    const pictureElements = document.querySelectorAll('picture');
    
    pictureElements.forEach(picture => {
      const sources = picture.querySelectorAll('source[srcset]');
      const img = picture.querySelector('img');
      
      sources.forEach(source => {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
          urls.forEach(url => {
            try {
              const fullUrl = new URL(url, window.location.href);
              const filename = this.getFilenameFromUrl(fullUrl.href) || `image_${Date.now()}.jpg`;
              
              if (!images.find(img => img.url === fullUrl.href)) {
                images.push({
                  url: fullUrl.href,
                  filename: filename,
                  alt: img ? img.alt || '' : '',
                  title: img ? img.title || '' : '',
                  type: 'picture-source'
                });
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });
        }
      });
    });
  }

  extractBackgroundImages(images) {
    const elements = document.querySelectorAll('*');
    
    elements.forEach(element => {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;
      
      if (bgImage && bgImage !== 'none') {
        const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
        if (matches) {
          matches.forEach(match => {
            const url = match.slice(4, -1).replace(/['"]/g, '');
            try {
              const fullUrl = new URL(url, window.location.href);
              const filename = this.getFilenameFromUrl(fullUrl.href) || `bg_image_${Date.now()}.jpg`;
              
              if (!images.find(img => img.url === fullUrl.href)) {
                images.push({
                  url: fullUrl.href,
                  filename: filename,
                  type: 'background-image'
                });
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });
        }
      }
    });
  }

  extractLinks(baseUrl) {
    const links = [];
    const elements = document.querySelectorAll('a[href]');
    
    elements.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        try {
          const fullUrl = new URL(href, window.location.href);
          
          // Only include links from the same domain
          if (fullUrl.origin === new URL(window.location.href).origin) {
            links.push({
              url: fullUrl.href,
              text: link.textContent.trim(),
              title: link.title || ''
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    return links;
  }

  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      // Try to get from query parameters
      const searchParams = urlObj.searchParams;
      for (const [key, value] of searchParams) {
        if (key.toLowerCase().includes('filename') || key.toLowerCase().includes('name')) {
          return value;
        }
      }
      
      // Try to extract from CDN URLs
      if (urlObj.hostname.includes('cdn') || urlObj.hostname.includes('assets')) {
        const pathParts = pathname.split('/');
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const part = pathParts[i];
          if (part && part.includes('.')) {
            return part;
          }
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }
}

// Initialize the page extractor
new PageExtractor();
