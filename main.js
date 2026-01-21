const FREE_LIMIT = 10;

// Paddle Billing Configuration
const PADDLE_CLIENT_TOKEN = 'test_c2deb3cb9b85f4b2afcd596c107';
const PADDLE_PRICE_ID = 'pri_01kfc8wsrhhqezk6htxdy7eppe';

// Initialize Paddle Billing - SET ENVIRONMENT FIRST!
if (typeof Paddle !== 'undefined') {
    try {
        Paddle.Environment.set('sandbox');
        console.log('Environment set to sandbox');
        
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

function getNewFilename(index, startNum, prefix) {
    const num = (startNum + index).toString().padStart(3, '0');
    return prefix ? prefix + '_' + num + '.jpg' : num + '.jpg';
}

function displayMetadata(file) {
    const metadataDiv = document.getElementById('metadata');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const exifObj = piexif.load(dataUrl);
        
        const captureDate = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal]) || 
                           (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.DateTime]) || 'Not available';
        const cameraModel = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Model]) || 'Not available';
        const gpsPresent = (exifObj['GPS'] && Object.keys(exifObj['GPS']).length > 0) ? 'Yes' : 'No';
        const copyright = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Copyright]) || 'Not set';
        const bodySerial = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.BodySerialNumber]) || 'Not set';
        const ownerName = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.CameraOwnerName]) || 'Not set';
        const lensSerial = (exifObj['Exif'] && exifObj['Exif'][piexif.ExifIFD.LensSerialNumber]) || 'Not set';
        const software = (exifObj['0th'] && exifObj['0th'][piexif.ImageIFD.Software]) || 'Not set';
        
        metadataDiv.innerHTML = '<h3>EXIF Metadata</h3>' +
            '<p>Capture date: ' + captureDate + '</p>' +
            '<p>Camera model: ' + cameraModel + '</p>' +
            '<p>GPS present: ' + gpsPresent + '</p>' +
            '<p>Copyright: ' + copyright + '</p>' +
            '<h4>Serial & Software Tags:</h4>' +
            '<p>Body Serial Number: ' + bodySerial + '</p>' +
            '<p>Camera Owner Name: ' + ownerName + '</p>' +
            '<p>Lens Serial Number: ' + lensSerial + '</p>' +
            '<p>Software: ' + software + '</p>';
    };
    reader.readAsDataURL(file);
}

function displayFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        clearUI();
        return;
    }
    
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    const startNum = parseInt(document.getElementById('startNum').value) || 1;
    const prefix = document.getElementById('filenamePrefix').value.trim();
    const hasLockedFiles = !isUnlocked() && files.length > FREE_LIMIT;
    
    // Build file list with 15 file preview limit
    const PREVIEW_LIMIT = 15;
    const filesToShow = Math.min(files.length, PREVIEW_LIMIT);
    
    let html = '<h3>Files to be renamed:</h3><ul>';
    for (let i = 0; i < filesToShow; i++) {
        const newName = getNewFilename(i, startNum, prefix);
        const isLocked = !isUnlocked() && i >= FREE_LIMIT;
        const lockedText = isLocked ? ' [LOCKED]' : '';
        html += '<li style="cursor: pointer;" data-index="' + i + '">' + files[i].name + ' => ' + newName + lockedText + '</li>';
    }
    html += '</ul>';
    
    // Show summary if more files exist
    if (files.length > PREVIEW_LIMIT) {
        const remaining = files.length - PREVIEW_LIMIT;
        html += '<p style="font-style: italic; color: #666;">+ ' + remaining + ' more file' + (remaining === 1 ? '' : 's') + ' will be processed correctly</p>';
    }
    
    document.getElementById('fileList').innerHTML = html;
    
    // Add click handlers to list items
    const listItems = document.querySelectorAll('#fileList li[data-index]');
    listItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            displayMetadata(files[index]);
        });
    });
    
    const limitMessageDiv = document.getElementById('limitMessage');
    if (hasLockedFiles) {
        limitMessageDiv.innerHTML = '<p><strong>Free limit: ' + FREE_LIMIT + ' images</strong></p>' +
            '<p>' + (files.length - FREE_LIMIT) + ' file' + (files.length - FREE_LIMIT === 1 ? '' : 's') + ' locked. Unlock unlimited for $9.</p>';
        
        if (!document.getElementById('unlockBtn')) {
            const unlockBtn = document.createElement('button');
            unlockBtn.id = 'unlockBtn';
            unlockBtn.className = 'unlock-btn';
            unlockBtn.textContent = 'Unlock unlimited - $9';
            unlockBtn.addEventListener('click', handleUnlock);
            limitMessageDiv.appendChild(unlockBtn);
        }
        
        // Add restore purchase UI
        if (!document.getElementById('restoreContainer')) {
            const restoreContainer = document.createElement('div');
            restoreContainer.id = 'restoreContainer';
            restoreContainer.style.marginTop = '20px';
            restoreContainer.style.paddingTop = '20px';
            restoreContainer.style.borderTop = '1px solid #ddd';
            
            const restoreText = document.createElement('p');
            restoreText.textContent = 'Already purchased?';
            restoreText.style.fontSize = '14px';
            restoreText.style.marginBottom = '10px';
            
            const restoreBtn = document.createElement('button');
            restoreBtn.id = 'restoreBtn';
            restoreBtn.className = 'unlock-btn';
            restoreBtn.textContent = 'Restore purchase';
            restoreBtn.style.backgroundColor = '#6c757d';
            restoreBtn.addEventListener('click', handleRestorePurchase);
            
            const emailInput = document.createElement('input');
            emailInput.id = 'restoreEmail';
            emailInput.type = 'email';
            emailInput.placeholder = 'Enter your checkout email';
            emailInput.style.display = 'none';
            emailInput.style.width = '100%';
            emailInput.style.maxWidth = '300px';
            emailInput.style.padding = '10px';
            emailInput.style.marginTop = '10px';
            emailInput.style.marginBottom = '10px';
            emailInput.style.border = '1px solid #ddd';
            emailInput.style.borderRadius = '4px';
            
            const restoreStatus = document.createElement('p');
            restoreStatus.id = 'restoreStatus';
            restoreStatus.style.fontSize = '14px';
            restoreStatus.style.marginTop = '10px';
            
            restoreContainer.appendChild(restoreText);
            restoreContainer.appendChild(restoreBtn);
            restoreContainer.appendChild(emailInput);
            restoreContainer.appendChild(restoreStatus);
            
            limitMessageDiv.appendChild(restoreContainer);
        }
        
        document.getElementById('downloadBtn').disabled = true;
    } else {
        limitMessageDiv.innerHTML = '';
        document.getElementById('downloadBtn').disabled = false;
    }
    
    // CRITICAL: Auto-display first file's metadata
    displayMetadata(files[0]);
}

function clearUI() {
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('metadata').innerHTML = '';
    document.getElementById('limitMessage').innerHTML = '';
    document.getElementById('downloadBtn').disabled = false;
}

function handleUnlock() {
    console.log('Opening checkout...');
    
    Paddle.Checkout.open({
        items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }]
    });
}

function handleRestorePurchase() {
    const restoreContainer = document.getElementById('restoreContainer');
    const restoreBtn = document.getElementById('restoreBtn');
    const emailInput = document.getElementById('restoreEmail');
    const restoreStatus = document.getElementById('restoreStatus');
    
    // First click: show email input
    if (emailInput.style.display === 'none') {
        emailInput.style.display = 'block';
        restoreBtn.textContent = 'Check purchase';
        emailInput.focus();
        return;
    }
    
    // Second click: check purchase
    const email = emailInput.value.trim();
    
    if (!email) {
        restoreStatus.textContent = 'Please enter your email address.';
        restoreStatus.style.color = '#d32f2f';
        return;
    }
    
    // Disable button and show loading
    restoreBtn.disabled = true;
    restoreStatus.textContent = 'Checking your purchase…';
    restoreStatus.style.color = '#666';
    
    // Call API
    fetch('/api/check-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Network error');
        }
        return response.json();
    })
    .then(function(data) {
        if (data.unlocked) {
            // Success: unlock the app
            setUnlocked(true);
            restoreStatus.textContent = 'Purchase verified. Unlimited access restored.';
            restoreStatus.style.color = '#4caf50';
            
            // Hide restore UI and update app
            setTimeout(function() {
                displayFiles();
            }, 1500);
        } else {
            // No purchase found
            restoreStatus.textContent = "We couldn't find a completed purchase for that email. Make sure you used the email from checkout.";
            restoreStatus.style.color = '#d32f2f';
            restoreBtn.disabled = false;
        }
    })
    .catch(function(error) {
        console.error('Restore purchase error:', error);
        restoreStatus.textContent = 'Something went wrong. Please try again.';
        restoreStatus.style.color = '#d32f2f';
        restoreBtn.disabled = false;
    });
}

async function removeMetadata(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            let exifObj = piexif.load(dataUrl);
            
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
            
            const exifBytes = piexif.dump(exifObj);
            const newDataUrl = piexif.insert(exifBytes, dataUrl);
            
            const arr = newDataUrl.split(',');
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            
            resolve(new Blob([u8arr], {type: 'image/jpeg'}));
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('fileInput').addEventListener('change', displayFiles);
document.getElementById('startNum').addEventListener('input', displayFiles);
document.getElementById('filenamePrefix').addEventListener('input', displayFiles);

document.getElementById('downloadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        alert('Please select at least one file');
        return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name));

    const startNum = parseInt(document.getElementById('startNum').value) || 1;
    const prefix = document.getElementById('filenamePrefix').value.trim();
    const removeGPS = document.getElementById('removeGPS').checked;
    const removeSerial = document.getElementById('removeSerial').checked;
    
    const filesToProcess = isUnlocked() ? files : files.slice(0, FREE_LIMIT);

    const zip = new JSZip();

    for (let i = 0; i < filesToProcess.length; i++) {
        const newName = getNewFilename(i, startNum, prefix);
        
        if (removeGPS || removeSerial) {
            const cleanedFile = await removeMetadata(filesToProcess[i]);
            zip.file(newName, cleanedFile);
        } else {
            zip.file(newName, filesToProcess[i]);
        }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'images.zip';
    link.click();
});

const clearBtn = document.createElement('button');
clearBtn.id = 'clearBtn';
clearBtn.textContent = 'Clear Selected Images';
clearBtn.className = 'unlock-btn';
clearBtn.style.backgroundColor = '#6c757d';
clearBtn.style.marginTop = '10px';
clearBtn.addEventListener('click', () => {
    document.getElementById('fileInput').value = '';
    clearUI();
});
document.getElementById('uploadSection').appendChild(clearBtn);
