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
    const files = Array.from(document.getElementById('fileInput').files);
    const fileList = document.getElementById('fileList');
    const limitMessage = document.getElementById('limitMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    const startNum = parseInt(document.getElementById('startNum').value);
    const prefix = document.getElementById('filenamePrefix').value.trim();

    if (files.length === 0) {
        clearUI();
        return;
    }

    const unlocked = isUnlocked();
    const exceededLimit = !unlocked && files.length > FREE_LIMIT;
    
    fileList.innerHTML = '<h3>Files to be renamed:</h3>';
    
    // Cap preview at 25 files
    const PREVIEW_LIMIT = 25;
    const filesToShow = Math.min(files.length, PREVIEW_LIMIT);
    
    for (let i = 0; i < filesToShow; i++) {
        const oldName = files[i].name;
        const newName = getNewFilename(i, startNum, prefix);
        const div = document.createElement('div');
        div.className = 'file-item';
        
        if (i >= FREE_LIMIT && exceededLimit) {
            div.classList.add('locked');
        }
        
        div.innerHTML = `${oldName} → <strong>${newName}</strong>`;
        fileList.appendChild(div);
    }
    
    // Show summary if more files exist
    if (files.length > PREVIEW_LIMIT) {
        const remaining = files.length - PREVIEW_LIMIT;
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'file-item';
        summaryDiv.style.fontStyle = 'italic';
        summaryDiv.style.color = '#666';
        summaryDiv.innerHTML = `<br>+ ${remaining} more file${remaining === 1 ? '' : 's'} will be processed correctly`;
        fileList.appendChild(summaryDiv);
    }

    if (exceededLimit) {
        const lockedCount = files.length - FREE_LIMIT;
        limitMessage.innerHTML = `
            <p><strong>Free limit: ${FREE_LIMIT} images</strong></p>
            <p>${lockedCount} file${lockedCount === 1 ? '' : 's'} locked. Unlock unlimited for $9.</p>
        `;
        
        if (!document.getElementById('unlockBtn')) {
            const unlockBtn = document.createElement('button');
            unlockBtn.id = 'unlockBtn';
            unlockBtn.className = 'unlock-btn';
            unlockBtn.textContent = 'Unlock unlimited - $9';
            unlockBtn.addEventListener('click', handleUnlock);
            limitMessage.appendChild(unlockBtn);
        }
        
        downloadBtn.disabled = true;
    } else {
        limitMessage.innerHTML = '';
        downloadBtn.disabled = false;
    }
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
