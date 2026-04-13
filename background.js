try { importScripts('jszip.min.js'); } catch (e) { console.error(e); }
class ImageDownloader {
  constructor() {
    this.downloads = new Map();
    this.isDownloading = false;
  }

  parseHTMLWithRegex(html, baseUrl) {
    // Simple regex-based parsing for images and links
    console.log('parseHTMLWithRegex called');
    console.log('HTML type:', typeof html);
    console.log('HTML is null:', html === null);
    console.log('HTML is string:', typeof html === 'string');
    console.log('HTML length:', html ? html.length : 'null');
    
    if (!html || typeof html !== 'string') {
      console.error('Invalid HTML input to parseHTMLWithRegex');
      return null;
    }
    
    const result = {
      querySelectorAll: (selector) => {
        console.log('Processing selector:', selector);
        if (selector === 'a[href]') {
          console.log('Processing a[href] selector');
          const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
          const links = [];
          let match;
          let matchCount = 0;
          while ((match = linkRegex.exec(html)) !== null) {
            matchCount++;
            console.log(`Match ${matchCount}:`, match);
            console.log('Match[1]:', match[1]);
            if (match[1] === null || match[1] === undefined) {
              console.error('NULL MATCH DETECTED! Full match array:', match);
            }
            // Capture the href value in the closure to prevent null reference
            const hrefValue = match[1] || '';
            links.push({
              getAttribute: (attr) => {
                console.log('getAttribute called with:', attr, 'hrefValue:', hrefValue);
                return attr === 'href' ? hrefValue : null;
              }
            });
          }
          console.log('Total matches found:', matchCount);
          return links;
        } else if (selector === 'img[src]') {
          const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*(?:title=["']([^"']*)["'])?[^>]*>/gi;
          const images = [];
          let match;
          while ((match = imgRegex.exec(html)) !== null) {
            // Capture values in the closure to prevent null reference
            const srcValue = match[1] || '';
            const altValue = match[2] || '';
            const titleValue = match[3] || '';
            images.push({
              getAttribute: (attr) => {
                if (attr === 'src') return srcValue;
                if (attr === 'alt') return altValue;
                if (attr === 'title') return titleValue;
                return null;
              },
              alt: altValue,
              title: titleValue
            });
          }
          return images;
        } else if (selector === 'picture') {
          const pictureRegex = /<picture[^>]*>(.*?)<\/picture>/gis;
          const pictures = [];
          let match;
          while ((match = pictureRegex.exec(html)) !== null) {
            const pictureContent = match[1];
            const sourceRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
            const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
            
            const sources = [];
            let sourceMatch;
            while ((sourceMatch = sourceRegex.exec(pictureContent)) !== null) {
              // Capture srcset value in closure
              const srcsetValue = sourceMatch[1] || '';
              sources.push({
                getAttribute: (attr) => attr === 'srcset' ? srcsetValue : null
              });
            }
            
            const imgMatch = imgRegex.exec(pictureContent);
            if (imgMatch) {
              // Capture img values in closure
              const imgAltValue = imgMatch[2] || '';
              const imgTitleValue = imgMatch[3] || '';
              pictures.push({
                querySelectorAll: (sel) => {
                  if (sel === 'source[srcset]') return sources;
                  if (sel === 'img') return [{
                    getAttribute: (attr) => {
                      if (attr === 'alt') return imgAltValue;
                      if (attr === 'title') return imgTitleValue;
                      return null;
                    },
                    alt: imgAltValue,
                    title: imgTitleValue
                  }];
                  return [];
                }
              });
            }
            return pictures;
          }
          return pictures;
        }
        return [];
      }
    };
    return result;
  }

  async startDownload(message) {
    if (this.isDownloading) {
      return { success: false, error: 'Download already in progress' };
    }

    this.isDownloading = true;
    const { url, domain, customDirectory } = message;
    
    console.log('Starting download for URL:', url);
    console.log('Using domain:', domain);
    
    try {
      // Send initial progress
      this.sendProgress(5, 'Analyzing website...', 'Analyzing website structure', null, null, 0, 0);
      
      // Get all pages to crawl
      const pages = await this.crawlWebsite(url);
      
      this.sendProgress(10, `Found ${pages.length} pages to crawl`, `Found ${pages.length} pages`, null, null, pages.length, 0);
      
      // Collect all images from all pages
      const allImages = new Map();
      let processedPages = 0;
      
      for (const pageUrl of pages) {
        try {
          this.sendProgress(
            10 + (processedPages / pages.length) * 40, 
            `Processing page: ${this.getPageName(pageUrl)}`, 
            `Crawling pages...`,
            null,
            this.getPageName(pageUrl),
            pages.length,
            allImages.size
          );
          
          const images = await this.getImagesFromPage(pageUrl);
          images.forEach(img => {
            if (!allImages.has(img.url)) {
              allImages.set(img.url, img);
            }
          });
          
          processedPages++;
        } catch (error) {
          console.error('Error processing page:', pageUrl, error);
        }
      }
      
      this.sendProgress(50, `Found ${allImages.size} unique images`, `Found ${allImages.size} images`, null, null, pages.length, allImages.size);
      
      // Download all images
      let downloadedCount = 0;
      const totalCount = allImages.size;
      
      if (message.asZip) {
        this.sendProgress(50, `Zipping ${totalCount} images...`, `Preparing ZIP...`, null, null, pages.length, allImages.size);
        const zip = new JSZip();
        let folderPath;
        if (customDirectory) {
          folderPath = customDirectory.replace(/[^a-zA-Z0-9 \/_-]/g, '_');
        } else {
          folderPath = domain.replace(/[^a-zA-Z0-9 \/_-]/g, '_');
        }
        const imgFolder = zip.folder(folderPath);

        for (const [imageUrl, imageInfo] of allImages) {
          try {
             this.sendProgress(
              50 + (downloadedCount / totalCount) * 40,
              `Fetching images for ZIP...`,
              `Fetching image data...`,
              imageInfo.filename,
              this.getPageName(imageInfo.sourcePage || url),
              pages.length,
              allImages.size
            );
            const resp = await fetch(imageUrl);
            if (!resp.ok) continue;
            const buffer = await resp.arrayBuffer();
            const filename = imageInfo.filename || `image_${Date.now()}.jpg`;
            imgFolder.file(filename, buffer);
            downloadedCount++;
          } catch(e) {
             console.error('Error fetching image for zip', imageUrl, e);
          }
        }
        
        this.sendProgress(95, `Generating zip file...`, `Generating ZIP...`, null, null, pages.length, allImages.size);
        const content = await zip.generateAsync({type:"base64"});
        
        chrome.downloads.download({
          url: "data:application/zip;base64," + content,
          filename: `${folderPath}.zip`,
          saveAs: false
        });

      } else {
        for (const [imageUrl, imageInfo] of allImages) {
          try {
            this.sendProgress(
              50 + (downloadedCount / totalCount) * 50, 
              `Downloading images...`, 
              `Downloading images...`,
              imageInfo.filename,
              this.getPageName(imageInfo.sourcePage || url),
              pages.length,
              allImages.size
            );
            
            await this.downloadImage(imageUrl, imageInfo, domain, customDirectory);
            downloadedCount++;
          } catch (error) {
            console.error('Error downloading image:', imageUrl, error);
          }
        }
      }
      
      this.sendComplete(downloadedCount, domain);
      return { success: true, imageCount: downloadedCount };
      
    } catch (error) {
      this.sendError(error.message);
      return { success: false, error: error.message };
    } finally {
      this.isDownloading = false;
    }
  }

  async crawlWebsite(startUrl) {
    const pages = new Set([startUrl]);
    const visited = new Set();
    const maxPages = 100; // Limit to prevent infinite crawling
    let currentUrl = startUrl;

    try {
      const baseUrl = new URL(startUrl);
      
      while (pages.size < maxPages) {
        const pagesToProcess = Array.from(pages).filter(url => !visited.has(url));
        
        if (pagesToProcess.length === 0) break;
        
        for (const url of pagesToProcess) {
          if (visited.size >= maxPages) break;
          
          visited.add(url);
          
          try {
            const newPages = await this.getLinksFromPage(url, baseUrl);
            newPages.forEach(page => {
              if (this.isValidPageUrl(page, baseUrl) && !pages.has(page)) {
                pages.add(page);
              }
            });
          } catch (error) {
            console.error('Error getting links from:', url, error);
          }
        }
      }
    } catch (error) {
      console.error('Error crawling website:', error);
    }
    
    return Array.from(pages);
  }

  async getLinksFromPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        return [];
      }
      
      const html = await response.text();
      console.log('HTML length:', html.length);
      
      const doc = this.parseHTMLWithRegex(html, url);
      
      const links = [];
      const elements = doc.querySelectorAll('a[href]');
      console.log('Found elements:', elements.length);
      
      elements.forEach((link, index) => {
        try {
          const href = link.getAttribute('href');
          console.log(`Link ${index}:`, href);
          if (href) {
            const fullUrl = new URL(href, url);
            if (fullUrl.origin === new URL(url).origin) {
              links.push(fullUrl.href);
            }
          }
        } catch (e) {
          console.error('Error processing link:', e, 'at index:', index);
        }
      });
      
      return links;
    } catch (error) {
      console.error('Error getting links from:', url, error);
      console.error('Error stack:', error.stack);
      return [];
    }
  }

  async getImagesFromPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        return [];
      }
      
      const html = await response.text();
      const doc = this.parseHTMLWithRegex(html, url);
      
      const images = [];
      const elements = doc.querySelectorAll('img[src]');
      
      elements.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          try {
            const imageUrl = new URL(src, url);
            const filename = this.getFilenameFromUrl(imageUrl.href) || `image_${Date.now()}.jpg`;
            
            images.push({
              url: imageUrl.href,
              filename: filename,
              alt: img.alt || img.getAttribute('alt') || '',
              title: img.title || img.getAttribute('title') || '',
              sourcePage: url
            });
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
      
      // Also check for images in picture elements
      const pictureElements = doc.querySelectorAll('picture');
      pictureElements.forEach(picture => {
        const sources = picture.querySelectorAll('source[srcset]');
        const imgElements = picture.querySelectorAll('img');
        const img = imgElements.length > 0 ? imgElements[0] : null;
        
        sources.forEach(source => {
          const srcset = source.getAttribute('srcset');
          if (srcset) {
            const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
            urls.forEach(imgUrl => {
              try {
                const fullUrl = new URL(imgUrl, url);
                const filename = this.getFilenameFromUrl(fullUrl.href) || `image_${Date.now()}.jpg`;
                
                if (!images.find(img => img.url === fullUrl.href)) {
                  images.push({
                    url: fullUrl.href,
                    filename: filename,
                    alt: img ? (img.alt || img.getAttribute('alt') || '') : '',
                    title: img ? (img.title || img.getAttribute('title') || '') : '',
                    type: 'picture-source',
                    sourcePage: url
                  });
                }
              } catch (e) {
                // Invalid URL, skip
              }
            });
          }
        });
      });
      
      return images;
    } catch (error) {
      console.error('Error getting images from page:', url, error);
      return [];
    }
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
      
      return null;
    } catch (e) {
      return null;
    }
  }

  async downloadImage(imageUrl, imageInfo, domain, customDirectory) {
    const filename = imageInfo.filename || `image_${Date.now()}.jpg`;
    
    let folderPath;
    if (customDirectory) {
      // Use custom directory (allow spaces, dashes, underscores, slashes)
      folderPath = customDirectory.replace(/[^a-zA-Z0-9 \/_-]/g, '_');
    } else {
      // Use default domain folder
      folderPath = domain.replace(/[^a-zA-Z0-9 \/_-]/g, '_');
    }
    
    console.log('Downloading image:', imageUrl);
    console.log('Using folder:', folderPath);
    console.log('Using filename:', filename);
    console.log('Full path:', `${folderPath}/${filename}`);
    
    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: imageUrl,
        filename: `${folderPath}/${filename}`,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log('Download successful, ID:', downloadId);
          resolve(downloadId);
        }
      });
    });
  }

  isValidPageUrl(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin === baseUrl.origin && 
             !urlObj.href.includes('#') && 
             !urlObj.href.includes('javascript:') &&
             (urlObj.pathname.endsWith('/') || urlObj.pathname.endsWith('.html') || 
              urlObj.pathname.endsWith('.htm') || !urlObj.pathname.includes('.'));
    } catch (e) {
      return false;
    }
  }

  getPageName(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'home';
      return filename.length > 30 ? filename.substring(0, 27) + '...' : filename;
    } catch (e) {
      return 'unknown-page';
    }
  }

  sendProgress(percentage, text, status, currentImage = null, currentPage = null, pagesFound = 0, imagesFound = 0) {
    chrome.runtime.sendMessage({
      type: 'progress',
      percentage: percentage,
      text: text,
      status: status,
      currentImage: currentImage,
      currentPage: currentPage,
      pagesFound: pagesFound,
      imagesFound: imagesFound
    });
  }

  sendComplete(imageCount, domain) {
    chrome.runtime.sendMessage({
      type: 'complete',
      imageCount: imageCount,
      domain: domain
    });
  }

  sendError(error) {
    chrome.runtime.sendMessage({
      type: 'error',
      error: error
    });
  }
}

const downloader = new ImageDownloader();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startDownload') {
    downloader.startDownload(message).then(sendResponse);
    return true; // Keep the message channel open for async response
  }
});
