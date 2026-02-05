// ===========================
// State Management
// ===========================
let uploadedFiles = [];
let conversionMode = 'images-to-pdf'; // 'images-to-pdf' or 'pdf-to-images'

// ===========================
// DOM Elements
// ===========================
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const filesGrid = document.getElementById('filesGrid');
const clearAllBtn = document.getElementById('clearAllBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const convertBtn = document.getElementById('convertBtn');
const convertBtnText = document.getElementById('convertBtnText');
const convertSection = document.getElementById('convertSection');

// ===========================
// Navigation
// ===========================
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active nav button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding section
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(`${tab}-section`).classList.add('active');
        
        // Update files grid when switching to files tab
        if (tab === 'files') {
            renderFilesGrid();
        }
    });
});

// ===========================
// File Upload Handlers
// ===========================
selectFilesBtn.addEventListener('click', () => {
    fileInput.click();
});

uploadZone.addEventListener('click', (e) => {
    if (e.target === uploadZone || e.target.closest('.upload-icon') || e.target.closest('h3') || e.target.closest('p')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Drag and Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

// ===========================
// File Processing
// ===========================
function handleFiles(files) {
    const filesArray = Array.from(files);
    
    filesArray.forEach(file => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert(`File "${file.name}" is not a supported format.`);
            return;
        }
        
        // Check if file already exists
        const existingFile = uploadedFiles.find(f => f.name === file.name && f.size === file.size);
        if (existingFile) {
            alert(`File "${file.name}" is already uploaded.`);
            return;
        }
        
        // Create file object
        const fileObj = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            url: URL.createObjectURL(file)
        };
        
        uploadedFiles.push(fileObj);
    });
    
    renderFilePreviews();
    
    // Show success animation
    if (filesArray.length > 0) {
        showNotification(`${filesArray.length} file(s) uploaded successfully!`);
        updateConvertButton();
    }
}

// ===========================
// Conversion Mode Handling
// ===========================
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active mode button
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update conversion mode
        conversionMode = btn.dataset.mode;
        
        // Update UI
        updateConvertButton();
        showNotification(`Mode: ${conversionMode === 'images-to-pdf' ? 'Images to PDF' : 'PDF to Images'}`);
    });
});

function updateConvertButton() {
    if (uploadedFiles.length === 0) {
        convertSection.style.display = 'none';
        return;
    }
    
    convertSection.style.display = 'block';
    
    if (conversionMode === 'images-to-pdf') {
        convertBtnText.textContent = 'Convert to PDF';
        // Check if we have images
        const hasImages = uploadedFiles.some(f => f.type.startsWith('image/'));
        convertBtn.disabled = !hasImages;
    } else {
        convertBtnText.textContent = 'Convert to Images';
        // Check if we have PDFs
        const hasPDFs = uploadedFiles.some(f => f.type === 'application/pdf');
        convertBtn.disabled = !hasPDFs;
    }
}

// Convert button handler
convertBtn.addEventListener('click', async () => {
    if (conversionMode === 'images-to-pdf') {
        await convertImagesToPDF();
    } else {
        await convertPDFToImages();
    }
});

// ===========================
// Conversion Functions
// ===========================
async function convertImagesToPDF() {
    const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showNotification('No images to convert!');
        return;
    }
    
    // Show processing state
    convertBtn.classList.add('processing');
    convertBtn.disabled = true;
    convertBtnText.textContent = 'Converting...';
    showNotification('Converting images to PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        let isFirstPage = true;
        
        for (const fileObj of imageFiles) {
            const img = new Image();
            
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    
                    // Calculate dimensions to fit the page
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const finalWidth = imgWidth * ratio;
                    const finalHeight = imgHeight * ratio;
                    
                    // Center the image
                    const x = (pdfWidth - finalWidth) / 2;
                    const y = (pdfHeight - finalHeight) / 2;
                    
                    if (!isFirstPage) {
                        pdf.addPage();
                    }
                    isFirstPage = false;
                    
                    pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
                    resolve();
                };
                img.onerror = reject;
                img.src = fileObj.url;
            });
        }
        
        // Save the PDF
        pdf.save('converted_images.pdf');
        showNotification(`Successfully converted ${imageFiles.length} image(s) to PDF!`);
        
    } catch (error) {
        console.error('PDF conversion error:', error);
        showNotification('Error converting to PDF. Please try again.');
    } finally {
        convertBtn.classList.remove('processing');
        convertBtn.disabled = false;
        convertBtnText.textContent = 'Convert to PDF';
    }
}

async function convertPDFToImages() {
    const pdfFiles = uploadedFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        showNotification('No PDFs to convert!');
        return;
    }
    
    // Show processing state
    convertBtn.classList.add('processing');
    convertBtn.disabled = true;
    convertBtnText.textContent = 'Converting...';
    showNotification('Converting PDF to images...');
    
    try {
        for (const fileObj of pdfFiles) {
            // Read the PDF file
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Convert each page to an image
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                
                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                // Render PDF page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Convert canvas to blob and download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${fileObj.name.replace('.pdf', '')}_page_${pageNum}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                });
            }
            
            showNotification(`Converted ${pdf.numPages} page(s) from ${fileObj.name}!`);
        }
        
        showNotification('PDF to images conversion complete!');
        
    } catch (error) {
        console.error('PDF to images error:', error);
        showNotification('Error converting PDF. Please try again.');
    } finally {
        convertBtn.classList.remove('processing');
        convertBtn.disabled = false;
        convertBtnText.textContent = 'Convert to Images';
    }
}

function renderFilePreviews() {
    filePreviewContainer.innerHTML = '';
    
    uploadedFiles.forEach(fileObj => {
        const fileCard = createFileCard(fileObj);
        filePreviewContainer.appendChild(fileCard);
    });
}

function renderFilesGrid() {
    if (uploadedFiles.length === 0) {
        filesGrid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13 2V9H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>No files uploaded yet</p>
            </div>
        `;
        return;
    }
    
    filesGrid.innerHTML = '';
    uploadedFiles.forEach(fileObj => {
        const fileCard = createFileCard(fileObj);
        filesGrid.appendChild(fileCard);
    });
}

function createFileCard(fileObj) {
    const card = document.createElement('div');
    card.className = 'file-preview';
    
    // Create thumbnail
    let thumbnail = '';
    if (fileObj.type.startsWith('image/')) {
        thumbnail = `<img src="${fileObj.url}" alt="${fileObj.name}" class="file-thumbnail">`;
    } else if (fileObj.type === 'application/pdf') {
        thumbnail = `
            <div class="file-thumbnail" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
                <svg style="width: 48px; height: 48px; color: white;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 13H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 17H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `;
    }
    
    card.innerHTML = `
        ${thumbnail}
        <div class="file-info">
            <div class="file-name" title="${fileObj.name}">${fileObj.name}</div>
            <div class="file-size">${fileObj.size}</div>
        </div>
        <div class="file-actions">
            <button class="download-btn" onclick="downloadFile('${fileObj.id}')">Download</button>
            <button class="remove-btn" onclick="removeFile('${fileObj.id}')">Remove</button>
        </div>
    `;
    
    return card;
}

// ===========================
// File Actions
// ===========================
function downloadFile(fileId) {
    const fileObj = uploadedFiles.find(f => f.id == fileId);
    if (!fileObj) return;
    
    const link = document.createElement('a');
    link.href = fileObj.url;
    link.download = fileObj.name;
    link.click();
    
    showNotification(`Downloading ${fileObj.name}...`);
}

function removeFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id != fileId);
    renderFilePreviews();
    renderFilesGrid();
    updateConvertButton();
    showNotification('File removed successfully');
}

clearAllBtn.addEventListener('click', () => {
    if (uploadedFiles.length === 0) return;
    
    if (confirm('Are you sure you want to remove all files?')) {
        // Clean up object URLs
        uploadedFiles.forEach(fileObj => {
            URL.revokeObjectURL(fileObj.url);
        });
        
        uploadedFiles = [];
        renderFilePreviews();
        renderFilesGrid();
        updateConvertButton();
        showNotification('All files cleared');
    }
});

// ===========================
// Utility Functions
// ===========================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: linear-gradient(135deg, hsl(262, 70%, 55%) 0%, hsl(335, 80%, 55%) 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        }, 300);
    }, 3000);
}

// Clean up object URLs on page unload
window.addEventListener('beforeunload', () => {
    uploadedFiles.forEach(fileObj => {
        URL.revokeObjectURL(fileObj.url);
    });
});
