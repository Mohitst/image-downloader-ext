# Image Downloader Chrome Extension

A Google Chrome extension that downloads all images from a website with their original names, organized in folders named after the domain.

## Features

- **Smart Crawling**: Automatically crawls through all pages of a website (up to 100 pages)
- **Original Names**: Preserves original image filenames when possible
- **Domain Organization**: Creates folders named after the website domain
- **Real-time Progress**: Shows detailed progress including current image and page being processed
- **Futuristic Interface**: Modern glassmorphism design with smooth animations
- **Multiple Image Types**: Downloads regular images, background images, and picture elements
- **URL Validation**: Ensures valid URLs before starting downloads
- **Download Location**: Images are saved to your Chrome Downloads folder in domain-specific subfolders

## Installation

1. **Download the Extension Files**
   - Download all files in this extension folder

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top right

3. **Load the Extension**
   - Click the "Load unpacked" button
   - Select the extension folder containing all the files
   - The extension should now appear in your extensions list

4. **Pin the Extension (Optional)**
   - Click the puzzle icon in the Chrome toolbar
   - Find "Image Downloader Extension" and click the pin icon to add it to your toolbar

## Usage

1. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - A popup window will appear

2. **Enter Website URL**
   - Type or paste the website URL (e.g., `https://example.com`)
   - The extension remembers your last used URL

3. **Start Download**
   - Click "Start Download" button
   - The extension will:
     - Crawl through all pages of the website (up to 100 pages)
     - Collect all unique images from all pages
     - Download images to a folder named after the domain
     - Show progress during the process

4. **Check Downloads**
   - Images are saved in your Chrome Downloads folder
   - Each website gets its own subfolder named after the domain
   - Images retain their original filenames when possible

## File Structure

```
image-downloader-ext/
  manifest.json          # Extension configuration
  popup.html             # User interface
  popup.js               # Popup logic and user interactions
  background.js          # Main download logic and crawling
  content.js             # Page content extraction
  README.md              # This file
  icon16.png             # Extension icons (optional)
  icon48.png
  icon128.png
```

## Permissions

The extension requires the following permissions:

- **activeTab**: Access to the current tab for content extraction
- **downloads**: Download files to the user's computer
- **scripting**: Execute scripts on web pages
- **storage**: Remember user preferences (last used URL)
- **host_permissions**: Access to all websites for crawling

## Download Location

Images are automatically saved to your Chrome Downloads folder with the following structure:

```
Downloads/
  [domain-name]/
    image1.jpg
    image2.png
    background-image.jpg
    ...
```

For example, if you download images from `https://example.com`, they will be saved in:
`Downloads/example.com/`

The extension creates a separate folder for each domain to keep images organized.

## How It Works

1. **URL Input**: User enters a website URL in the popup
2. **Website Crawling**: The background script discovers all pages on the website (up to 100 pages)
3. **Image Extraction**: Content scripts extract images from each page including:
   - Regular `<img>` tags
   - `<picture>` elements with multiple sources
   - CSS background images
4. **Real-time Progress**: The extension shows:
   - Current page being processed
   - Current image being downloaded
   - Total pages and images found
   - Overall progress percentage
5. **Download Process**: Images are downloaded using Chrome's downloads API
6. **File Organization**: Images are saved in folders named after the domain

## Limitations

- Maximum 100 pages crawled per website (to prevent infinite loops)
- Only downloads images from the same domain as the starting URL
- Some websites may block automated crawling
- Large websites may take considerable time to process

## Troubleshooting

**Extension doesn't load:**
- Ensure Developer mode is enabled in Chrome
- Check that all files are in the same folder
- Verify manifest.json syntax is correct

**Download fails:**
- Check that the URL is valid and accessible
- Ensure the website allows image access
- Try with a smaller website first

**Images not found:**
- Some websites use lazy loading or dynamic content
- The extension only finds images in the initial page load
- Try refreshing the page and running again

## Security

- The extension only accesses images from the specified domain
- No personal data is collected or transmitted
- All processing happens locally in your browser
- Downloads go to your standard Chrome Downloads folder

## Version History

**v1.0** - Initial release
- Basic website crawling and image downloading
- Domain-based folder organization
- Progress tracking and user interface
