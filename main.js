const FREE_LIMIT = 10;

// Paddle Billing Configuration
const PADDLE_CLIENT_TOKEN = 'live_2f1290ddf0609ffc67fcc46679b';
const PADDLE_PRICE_ID = 'pri_01kg5n2jrb4xwpgehfhrpqjm0y';

// Supported file extensions by category
const JPEG_EXTENSIONS = ['.jpg', '.jpeg'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.bmp', '.gif', '.heic', '.heif'];
const RAW_EXTENSIONS = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.raf', '.rw2'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'];
const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...RAW_EXTENSIONS, ...VIDEO_EXTENSIONS];

// Initialize Paddle Billing
if (typeof Paddle !== 'undefined') {
    try {
        Paddle.Environment.set('production');

        Paddle.Initialize({
            token: PADDLE_CLIENT_TOKEN,
            eventCallback: function(data) {
                console.log('PADDLE EVENT:', data.name, data);

                if (data.name === 'checkout.completed') {
                    console.log('Payment completed! Unlocking...');
                    setUnlocked(true);

                    setTimeout(function() {
                        Paddle.Checkout.close();
                        displayFiles();
                    }, 1000);
                }
            }
        });

        console.log('Paddle initialized successfully');
    } catch (error) {
        console.error('Paddle initialization failed:', error);
    }
} else {
    console.error('Paddle SDK not loaded');
}

// --- Utility functions ---

function isUnlocked() {
    return localStorage.getItem('unlocked') === 'true';
}

function setUnlocked(value) {
    if (value) {
        localStorage.setItem('unlocked', 'true');
    } else {
        localStorage.removeItem('unlocked');
    }
}

function getFileExtension(filename) {
    const dot = filename.lastIndexOf('.');
    return dot !== -1 ? filename.substring(dot).toLowerCase() : '';
}

function isJpeg(file) {
    const ext = getFileExtension(file.name);
    return JPEG_EXTENSIONS.includes(ext);
}

function isSupportedFile(file) {
    const ext = getFileExtension(file.name);
    return ALL_EXTENSIONS.includes(ext);
}

function getFileCategory(file) {
    const ext = getFileExtension(file.name);
    if (JPEG_EXTENSIONS.includes(ext)) return 'jpeg';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (RAW_EXTENSIONS.includes(ext)) return 'raw';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return 'other';
}

function getNewFilename(index, startNum, prefix, originalFilename) {
    const ext = getFileExtension(originalFilename);
    const num = (startNum + index).toString().padStart(3, '0');
    return prefix ? prefix + '_' + num + ext : num + ext;
}

// --- EXIF functions (JPEG only) ---

function displayMetadata(file) {
    const metadataDiv = document.getElementById('metadata');

    if (!isJpeg(file)) {
        const cat = getFileCategory(file);
        var label = cat === 'raw' ? 'RAW file' : cat === 'video' ? 'Video file' : 'Image file';
        metadataDiv.innerHTML = '<h3>File Info</h3>' +
            '<p>Filename: ' + file.name + '</p>' +
            '<p>Type: ' + label + '</p>' +
            '<p>Size: ' + (file.size / (1024 * 1024)).toFixed(2) + ' MB</p>' +
            '<p class="helper-text">EXIF metadata preview is available for JPEG files only.</p>';
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var dataUrl = e.target.result;
        try {
            var exifObj = piexif.load(dataUrl);

            var captureDate = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal]) ||
                             (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.DateTime]) || 'Not available';
            var cameraModel = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Model]) || 'Not available';
            var gpsPresent = (exifObj['GPS'] && Object.keys(exifObj['GPS']).length > 0) ? 'Yes' : 'No';
            var copyright = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Copyright]) || 'Not set';
            var bodySerial = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.BodySerialNumber]) || 'Not set';
            var ownerName = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.CameraOwnerName]) || 'Not set';
            var lensSerial = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.LensSerialNumber]) || 'Not set';
            var software = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Software]) || 'Not set';

            metadataDiv.innerHTML = '<h3>EXIF Metadata</h3>' +
                '<p>Capture date: ' + captureDate + '</p>' +
                '<p>Camera model: ' + cameraModel + '</p>' +
                '<p>GPS present: ' + gpsPresent + '</p>' +
                '<p>Copyright: ' + copyright + '</p>' +
                '<h4>Serial &amp; Software Tags:</h4>' +
                '<p>Body Serial Number: ' + bodySerial + '</p>' +
                '<p>Camera Owner Name: ' + ownerName + '</p>' +
                '<p>Lens Serial Number: ' + lensSerial + '</p>' +
                '<p>Software: ' + software + '</p>';
        } catch (err) {
            metadataDiv.innerHTML = '<h3>File Info</h3>' +
                '<p>Filename: ' + file.name + '</p>' +
                '<p>Size: ' + (file.size / (1024 * 1024)).toFixed(2) + ' MB</p>' +
                '<p class="helper-text">Could not read EXIF data from this file.</p>';
        }
    };
    reader.readAsDataURL(file);
}

async function removeMetadata(file) {
    return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var dataUrl = e.target.result;
            var exifObj = piexif.load(dataUrl);

            if (document.getElementById('removeGPS').checked) {
                delete exifObj['GPS'];
            }

            if (document.getElementById('removeSerial').checked) {
                if (exifObj['Exif']) {
                    delete exifObj['Exif'][piexif.ExifIFD.BodySerialNumber];
                    delete exifObj['Exif'][piexif.ExifIFD.CameraOwnerName];
                    delete exifObj['Exif'][piexif.ExifIFD.LensSerialNumber];
                }
                if (exifObj['0th']) {
                    delete exifObj['0th'][piexif.ImageIFD.Software];
                }
            }

            var exifBytes = piexif.dump(exifObj);
            var newDataUrl = piexif.insert(exifBytes, dataUrl);

            var arr = newDataUrl.split(',');
            var bstr = atob(arr[1]);
            var n = bstr.length;
            var u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            resolve(new Blob([u8arr], { type: 'image/jpeg' }));
        };
        reader.readAsDataURL(file);
    });
}

// --- Display functions ---

function displayFiles() {
    var fileInput = document.getElementById('fileInput');
    var files = Array.from(fileInput.files);

    if (files.length === 0) {
        clearUI();
        return;
    }

    // Filter to supported files only
    var supported = files.filter(isSupportedFile);
    var skipped = files.length - supported.length;

    supported.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var startNum = parseInt(document.getElementById('startNum').value) || 1;
    var prefix = document.getElementById('filenamePrefix').value.trim();
    var hasLockedFiles = !isUnlocked() && supported.length > FREE_LIMIT;

    // Count file types for summary
    var jpegCount = 0;
    var imageCount = 0;
    var rawCount = 0;
    var videoCount = 0;

    // Build file list (cap preview at 20 to prevent DOM bloat)
    var previewLimit = 20;
    var html = '';

    if (skipped > 0) {
        html += '<p class="helper-text">' + skipped + ' unsupported file(s) were skipped.</p>';
    }

    html += '<ul>';
    for (var i = 0; i < supported.length; i++) {
        var file = supported[i];
        var cat = getFileCategory(file);
        if (cat === 'jpeg') jpegCount++;
        else if (cat === 'image') imageCount++;
        else if (cat === 'raw') rawCount++;
        else if (cat === 'video') videoCount++;

        if (i < previewLimit) {
            var newName = getNewFilename(i, startNum, prefix, file.name);
            var isLocked = !isUnlocked() && i >= FREE_LIMIT;
            var lockedText = isLocked ? ' [LOCKED]' : '';
            var catLabel = cat === 'jpeg' ? '' : ' [' + cat.toUpperCase() + ']';
            html += '<li>' + file.name + ' => ' + newName + catLabel + lockedText + '</li>';
        }
    }
    html += '</ul>';

    if (supported.length > previewLimit) {
        html += '<p class="helper-text">+ ' + (supported.length - previewLimit) + ' more files will be processed.</p>';
    }

    // Summary line
    var parts = [];
    if (jpegCount > 0) parts.push(jpegCount + ' JPEG');
    if (imageCount > 0) parts.push(imageCount + ' image');
    if (rawCount > 0) parts.push(rawCount + ' RAW');
    if (videoCount > 0) parts.push(videoCount + ' video');
    if (parts.length > 0) {
        html = '<p><strong>' + supported.length + ' files selected:</strong> ' + parts.join(', ') + '</p>' + html;
    }

    document.getElementById('fileList').innerHTML = html;

    // Show/hide EXIF options based on whether any JPEGs are present
    var exifOptions = document.getElementById('exifOptions');
    if (jpegCount > 0) {
        exifOptions.style.display = 'block';
    } else {
        exifOptions.style.display = 'none';
        document.getElementById('removeGPS').checked = false;
        document.getElementById('removeSerial').checked = false;
    }

    // Limit message and unlock/restore UI
    var limitMessageDiv = document.getElementById('limitMessage');
    if (hasLockedFiles) {
        limitMessageDiv.innerHTML = '<p>Free limit reached (' + FREE_LIMIT + ' files). Unlock unlimited to process all ' + supported.length + ' files.</p>' +
            '<button class="unlock-btn" id="unlockBtn">Unlock Unlimited — $9.99</button>' +
            '<p class="restore-link">Already purchased? <a href="#" id="restoreLink">Restore your purchase</a></p>';
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
        document.getElementById('restoreLink').addEventListener('click', function(e) {
            e.preventDefault();
            handleRestorePurchase();
        });
    } else if (isUnlocked()) {
        limitMessageDiv.innerHTML = '<p class="unlocked-msg">Unlocked — processing all ' + supported.length + ' files.</p>';
        document.getElementById('downloadBtn').disabled = false;
    } else {
        limitMessageDiv.innerHTML = '';
        document.getElementById('downloadBtn').disabled = false;
    }

    // Show metadata for first file
    if (supported.length > 0) {
        displayMetadata(supported[0]);
    }
}

function clearUI() {
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('metadata').innerHTML = '';
    document.getElementById('limitMessage').innerHTML = '';
    document.getElementById('downloadBtn').disabled = false;
}

// --- Payment functions ---

function handleUnlock() {
    console.log('Opening checkout...');
    Paddle.Checkout.open({
        items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }]
    });
}

async function handleRestorePurchase() {
    var email = prompt('Enter the email address you used at checkout:');
    if (!email || !email.trim()) return;

    email = email.trim();

    // Show checking state
    var limitMessageDiv = document.getElementById('limitMessage');
    var originalContent = limitMessageDiv.innerHTML;
    limitMessageDiv.innerHTML = '<p>Checking purchase for ' + email + '...</p>';

    try {
        var response = await fetch('/api/check-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        var data = await response.json();

        if (data.unlocked) {
            setUnlocked(true);
            alert('Purchase restored! Your app is now unlocked.');
            displayFiles();
        } else {
            alert('No completed purchase was found for that email address. Make sure you are using the same email you entered at checkout.');
            limitMessageDiv.innerHTML = originalContent;
            // Re-attach event listeners since we replaced innerHTML
            var unlockBtn = document.getElementById('unlockBtn');
            if (unlockBtn) unlockBtn.addEventListener('click', handleUnlock);
            var restoreLink = document.getElementById('restoreLink');
            if (restoreLink) restoreLink.addEventListener('click', function(e) {
                e.preventDefault();
                handleRestorePurchase();
            });
        }
    } catch (error) {
        console.error('Restore purchase error:', error);
        alert('Something went wrong while checking your purchase. Please try again.');
        limitMessageDiv.innerHTML = originalContent;
        var unlockBtn2 = document.getElementById('unlockBtn');
        if (unlockBtn2) unlockBtn2.addEventListener('click', handleUnlock);
        var restoreLink2 = document.getElementById('restoreLink');
        if (restoreLink2) restoreLink2.addEventListener('click', function(e) {
            e.preventDefault();
            handleRestorePurchase();
        });
    }
}

// --- Event listeners ---

document.getElementById('fileInput').addEventListener('change', displayFiles);
document.getElementById('startNum').addEventListener('input', displayFiles);
document.getElementById('filenamePrefix').addEventListener('input', displayFiles);

document.getElementById('downloadBtn').addEventListener('click', async function() {
    var fileInput = document.getElementById('fileInput');
    var files = Array.from(fileInput.files).filter(isSupportedFile);

    if (files.length === 0) {
        alert('Please select at least one supported file.');
        return;
    }

    files.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var startNum = parseInt(document.getElementById('startNum').value) || 1;
    var prefix = document.getElementById('filenamePrefix').value.trim();
    var removeGPS = document.getElementById('removeGPS').checked;
    var removeSerial = document.getElementById('removeSerial').checked;

    var filesToProcess = isUnlocked() ? files : files.slice(0, FREE_LIMIT);

    // Show loading state
    var downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.textContent = 'Processing files...';
    downloadBtn.disabled = true;

    try {
        var zip = new JSZip();

        for (var i = 0; i < filesToProcess.length; i++) {
            var file = filesToProcess[i];
            var newName = getNewFilename(i, startNum, prefix, file.name);

            // Only strip EXIF from JPEGs
            if (isJpeg(file) && (removeGPS || removeSerial)) {
                var cleanedFile = await removeMetadata(file);
                zip.file(newName, cleanedFile);
            } else {
                zip.file(newName, file);
            }
        }

        var zipName = prefix ? prefix + '_delivery.zip' : 'delivery.zip';
        var blob = await zip.generateAsync({ type: 'blob' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = zipName;
        link.click();
    } catch (error) {
        console.error('ZIP generation error:', error);
        alert('An error occurred while generating the ZIP. Please try again.');
    } finally {
        downloadBtn.textContent = 'Download ZIP';
        downloadBtn.disabled = false;
    }
});

// Clear button
var clearBtn = document.createElement('button');
clearBtn.id = 'clearBtn';
clearBtn.textContent = 'Clear Selected Files';
clearBtn.className = 'unlock-btn';
clearBtn.style.backgroundColor = '#6c757d';
clearBtn.style.marginTop = '10px';
clearBtn.addEventListener('click', function() {
    document.getElementById('fileInput').value = '';
    clearUI();
});
document.getElementById('uploadSection').appendChild(clearBtn);
