const FREE_LIMIT = 10;

// Paddle Billing Configuration
const PADDLE_CLIENT_TOKEN = 'live_2f1290ddf0609ffc67fcc46679b';
const PADDLE_PRICE_ID = 'pri_01kg5n2jrb4xwpgehfhrpqjm0y';

// Supported file extensions by category
const JPEG_EXTENSIONS = ['.jpg', '.jpeg'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.bmp', '.gif', '.heic', '.heif'];
const RAW_EXTENSIONS = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.raf', '.rw2'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'];
const RENDERABLE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
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

function isRenderable(file) {
    const ext = getFileExtension(file.name);
    return RENDERABLE_EXTENSIONS.includes(ext);
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
        reader.onerror = function() {
            console.warn('Failed to read file for EXIF removal:', file.name);
            resolve(file); // Fallback: return original
        };
        reader.onload = function(e) {
            try {
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
            } catch (err) {
                console.warn('EXIF removal failed for', file.name, '— including original:', err);
                resolve(file); // Fallback: return original
            }
        };
        reader.readAsDataURL(file);
    });
}

// --- Resize function (canvas API) ---
async function resizeImage(fileOrBlob, maxLongEdge, jpegQuality) {
    var objectUrl = URL.createObjectURL(fileOrBlob);
    var img = new Image();

    try {
        await new Promise(function(resolve, reject) {
            img.onload = function() { resolve(); };
            img.onerror = function() { reject(new Error('Failed to load image for resize')); };
            img.src = objectUrl;
        });

        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var longEdge = Math.max(w, h);

        // Calculate target dimensions (only downscale, never upscale)
        var newW = w;
        var newH = h;
        if (longEdge > maxLongEdge) {
            var scale = maxLongEdge / longEdge;
            newW = Math.round(w * scale);
            newH = Math.round(h * scale);
        }

        var canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newW, newH);

        return await new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob returned null during resize'));
                }
            }, 'image/jpeg', jpegQuality / 100);
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

// --- Watermark function (canvas API) ---

async function applyWatermark(fileOrBlob, watermarkText, position, opacity, jpegQuality) {
    var objectUrl = URL.createObjectURL(fileOrBlob);
    var img = new Image();

    try {
        await new Promise(function(resolve, reject) {
            img.onload = function() { resolve(); };
            img.onerror = function() { reject(new Error('Failed to load image for watermark')); };
            img.src = objectUrl;
        });

        var w = img.naturalWidth;
        var h = img.naturalHeight;

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        ctx.globalAlpha = opacity / 100;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        if (position === 'center') {
            // Large diagonal watermark tiled across the entire image
            var fontSize = Math.max(Math.min(w, h) * 0.06, 16);
            ctx.font = 'bold ' + fontSize + 'px Arial, Helvetica, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate(-Math.atan2(h, w));

            var diag = Math.sqrt(w * w + h * h);
            var textWidth = ctx.measureText(watermarkText).width;
            var spacing = textWidth + fontSize * 2;
            var repeats = Math.ceil(diag / spacing) + 2;

            for (var r = -repeats; r <= repeats; r++) {
                for (var row = -3; row <= 3; row++) {
                    var x = r * spacing;
                    var y = row * fontSize * 3;
                    ctx.strokeText(watermarkText, x, y);
                    ctx.fillText(watermarkText, x, y);
                }
            }
            ctx.restore();
        } else {
            // Corner watermark
            var fontSize = Math.max(Math.min(w, h) * 0.035, 14);
            ctx.font = fontSize + 'px Arial, Helvetica, sans-serif';

            var padding = fontSize * 0.8;
            var tx, ty;

            if (position === 'bottom-right') {
                ctx.textAlign = 'right';
                tx = w - padding;
                ty = h - padding;
            } else if (position === 'bottom-left') {
                ctx.textAlign = 'left';
                tx = padding;
                ty = h - padding;
            } else if (position === 'top-right') {
                ctx.textAlign = 'right';
                tx = w - padding;
                ty = padding + fontSize;
            } else {
                ctx.textAlign = 'left';
                tx = padding;
                ty = padding + fontSize;
            }

            ctx.lineWidth = 2;
            ctx.strokeText(watermarkText, tx, ty);
            ctx.fillText(watermarkText, tx, ty);
        }

        ctx.globalAlpha = 1.0;

        // Determine output format — keep JPEG as JPEG, others become PNG
        var isJpegInput = false;
        if (fileOrBlob.name) {
            var ext = getFileExtension(fileOrBlob.name);
            isJpegInput = (ext === '.jpg' || ext === '.jpeg');
        } else {
            // Blob without name (from resize or EXIF strip) — check MIME type
            isJpegInput = (fileOrBlob.type === 'image/jpeg');
        }

        var mimeType = isJpegInput ? 'image/jpeg' : 'image/png';
        // Use caller's JPEG quality if provided, otherwise default to 92%
        var quality = isJpegInput ? (jpegQuality ? jpegQuality / 100 : 0.92) : undefined;

        return await new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob returned null during watermark'));
                }
            }, mimeType, quality);
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

// --- Delivery receipt generator ---

function generateDeliveryReceipt(filenames, prefix, photographerName, clientName, notes) {
    var lines = [];
    lines.push('========================================');
    lines.push('         DELIVERY RECEIPT');
    lines.push('========================================');
    lines.push('');
    lines.push('Date:          ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    lines.push('Time:          ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    if (photographerName) {
        lines.push('Photographer:  ' + photographerName);
    }
    if (clientName) {
        lines.push('Client:        ' + clientName);
    }
    lines.push('');
    lines.push('Total files:   ' + filenames.length);
    if (prefix) {
        lines.push('Naming prefix: ' + prefix);
    }
    lines.push('');
    lines.push('----------------------------------------');
    lines.push('FILES INCLUDED:');
    lines.push('----------------------------------------');
    for (var i = 0; i < filenames.length; i++) {
        lines.push('  ' + (i + 1).toString().padStart(3, ' ') + '. ' + filenames[i]);
    }
    lines.push('');
    if (notes && notes.trim()) {
        lines.push('----------------------------------------');
        lines.push('NOTES:');
        lines.push('----------------------------------------');
        lines.push(notes.trim());
        lines.push('');
    }
    lines.push('========================================');
    lines.push('Generated by Photo Delivery Prep');
    lines.push('https://photodeliveryprep.com');
    lines.push('========================================');
    return lines.join('\n');
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

    // Delivery options
    var doResize = document.getElementById('enableResize').checked;
    var doWatermark = document.getElementById('enableWatermark').checked;
    var doReceipt = document.getElementById('enableReceipt').checked;

    var resizeLongEdge = 2048;
    var jpegQuality = 80;
    if (doResize) {
        var preset = document.getElementById('resizePreset').value;
        resizeLongEdge = preset === 'custom'
            ? parseInt(document.getElementById('customSize').value) || 2048
            : parseInt(preset);
        jpegQuality = parseInt(document.getElementById('jpegQuality').value) || 80;
    }

    var watermarkText = '';
    var watermarkPosition = 'center';
    var watermarkOpacity = 30;
    if (doWatermark) {
        watermarkText = document.getElementById('watermarkText').value.trim();
        watermarkPosition = document.getElementById('watermarkPosition').value;
        watermarkOpacity = parseInt(document.getElementById('watermarkOpacity').value) || 30;
        if (!watermarkText) {
            alert('Please enter watermark text.');
            return;
        }
    }

    var filesToProcess = isUnlocked() ? files : files.slice(0, FREE_LIMIT);

    // Show loading state
    var downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.textContent = 'Processing files...';
    downloadBtn.disabled = true;

    var failedFiles = [];

    try {
        var zip = new JSZip();
        var allNewNames = [];

        for (var i = 0; i < filesToProcess.length; i++) {
            var file = filesToProcess[i];
            var newName = getNewFilename(i, startNum, prefix, file.name);

            // Update progress
            downloadBtn.textContent = 'Processing ' + (i + 1) + ' of ' + filesToProcess.length + '...';

            var renderable = isRenderable(file);
            var fileBlob = file;

            try {
                // Step 1: EXIF removal (JPEG only, before any canvas processing)
                if (isJpeg(file) && (removeGPS || removeSerial)) {
                    fileBlob = await removeMetadata(file);
                }

                // Step 2: Resize (renderable images only)
                if (doResize && renderable) {
                    fileBlob = await resizeImage(fileBlob, resizeLongEdge, jpegQuality);
                    // Resized files become JPEG — update extension
                    var nameNoExt = newName.substring(0, newName.lastIndexOf('.'));
                    newName = nameNoExt + '.jpg';
                }

                // Step 3: Watermark (renderable images only)
                // Pass jpegQuality so watermark uses the same quality as resize
                if (doWatermark && watermarkText && renderable) {
                    fileBlob = await applyWatermark(fileBlob, watermarkText, watermarkPosition, watermarkOpacity, doResize ? jpegQuality : null);
                }
            } catch (fileError) {
                // If processing fails for this file, include the original untouched
                console.warn('Processing failed for', file.name, '— including original:', fileError);
                fileBlob = file;
                failedFiles.push(file.name);
            }

            allNewNames.push(newName);
            zip.file(newName, fileBlob);
        }

        // Step 4: Delivery receipt
        if (doReceipt) {
            var photographerName = document.getElementById('receiptPhotographer').value.trim();
            var clientName = document.getElementById('receiptClient').value.trim();
            var receiptNotes = document.getElementById('receiptNotes').value.trim();
            var receiptText = generateDeliveryReceipt(allNewNames, prefix, photographerName, clientName, receiptNotes);
            zip.file('delivery-receipt.txt', receiptText);
        }

        var zipName = prefix ? prefix + '_delivery.zip' : 'delivery.zip';
        var blob = await zip.generateAsync({ type: 'blob' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = zipName;
        link.click();
        URL.revokeObjectURL(link.href);

        // Notify about any files that fell back to originals
        if (failedFiles.length > 0) {
            alert(failedFiles.length + ' file(s) could not be processed and were included as originals: ' + failedFiles.join(', '));
        }
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

// --- Delivery options toggle handlers ---

document.getElementById('enableResize').addEventListener('change', function() {
    document.getElementById('resizeSettings').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('resizePreset').addEventListener('change', function() {
    document.getElementById('customSizeWrap').style.display = this.value === 'custom' ? 'block' : 'none';
});

document.getElementById('jpegQuality').addEventListener('input', function() {
    document.getElementById('jpegQualityLabel').textContent = this.value + '%';
});

document.getElementById('enableWatermark').addEventListener('change', function() {
    document.getElementById('watermarkSettings').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('watermarkOpacity').addEventListener('input', function() {
    document.getElementById('watermarkOpacityLabel').textContent = this.value + '%';
});

document.getElementById('enableReceipt').addEventListener('change', function() {
    document.getElementById('receiptSettings').style.display = this.checked ? 'block' : 'none';
});
