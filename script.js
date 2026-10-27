/**
 * Telegram Cloud Uploader - Frontend Application Logic
 * Modern, robust, and accessible file uploader with queue management and real-time progress.
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Constants and Application State
    // -------------------------------------------------------------------------
    const DEFAULT_BACKEND_URL = 'https://telegram-uploader-backend.onrender.com/upload';
    
    const state = {
        config: {
            backendUrl: localStorage.getItem('tg_uploader_backend_url') || DEFAULT_BACKEND_URL,
            caption: localStorage.getItem('tg_uploader_caption') || '',
            theme: localStorage.getItem('tg_uploader_theme') || 'dark',
        },
        queue: [], // Array of QueueItem objects
        isUploadingAll: false,
        activeUploadCount: 0,
        maxConcurrent: 2, // Safe concurrent uploads to avoid Telegram rate limits
    };

    // -------------------------------------------------------------------------
    // 2. DOM Elements
    // -------------------------------------------------------------------------
    const elements = {
        html: document.documentElement,
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        serverStatusPill: document.getElementById('serverStatusPill'),
        serverStatusLabel: document.getElementById('serverStatusLabel'),
        serverWakeupNotice: document.getElementById('serverWakeupNotice'),
        
        // Upload & Dropzone
        uploadForm: document.getElementById('uploadForm'),
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        
        // Queue & Controls
        queueSection: document.getElementById('uploadQueueSection'),
        queueTitle: document.querySelector('.queue-title'),
        queueSummaryBadge: document.getElementById('queueSummaryBadge'),
        clearCompletedBtn: document.getElementById('clearCompletedBtn'),
        uploadAllBtn: document.getElementById('uploadAllBtn'),
        uploadAllBtnText: document.getElementById('uploadAllBtnText'),
        overallProgressContainer: document.getElementById('overallProgressContainer'),
        overallProgressLabel: document.getElementById('overallProgressLabel'),
        overallProgressPercent: document.getElementById('overallProgressPercent'),
        overallProgressFill: document.getElementById('overallProgressFill'),
        queueList: document.getElementById('queueList'),
        emptyQueueState: document.getElementById('emptyQueueState'),
        
        // Settings Modal
        settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        backendUrlInput: document.getElementById('backendUrlInput'),
        optionalCaptionInput: document.getElementById('optionalCaptionInput'),
        testConnectionBtn: document.getElementById('testConnectionBtn'),
        testResultMsg: document.getElementById('testResultMsg'),
        presetRenderBtn: document.getElementById('presetRenderBtn'),
        presetLocalBtn: document.getElementById('presetLocalBtn'),
        resetSettingsBtn: document.getElementById('resetSettingsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        
        // Toast
        toastContainer: document.getElementById('toastContainer'),
    };

    // -------------------------------------------------------------------------
    // 3. Theme Handling
    // -------------------------------------------------------------------------
    function initTheme() {
        const savedTheme = state.config.theme;
        applyTheme(savedTheme);
    }

    function applyTheme(theme) {
        state.config.theme = theme;
        elements.html.setAttribute('data-theme', theme);
        localStorage.setItem('tg_uploader_theme', theme);
    }

    elements.themeToggleBtn.addEventListener('click', () => {
        const newTheme = state.config.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // -------------------------------------------------------------------------
    // 4. Utility Functions
    // -------------------------------------------------------------------------
    function generateId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function formatSpeed(bytesPerSec) {
        if (!bytesPerSec || bytesPerSec <= 0) return '';
        return formatBytes(bytesPerSec, 1) + '/s';
    }

    function formatETA(seconds) {
        if (!isFinite(seconds) || seconds <= 0) return '';
        if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.ceil(seconds % 60);
        return `~${mins}m ${secs}s left`;
    }

    function getFileCategoryIcon(file) {
        const type = file.type;
        const name = file.name.toLowerCase();

        if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)) {
            return 'icon-image';
        }
        if (type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv)$/.test(name)) {
            return 'icon-video';
        }
        if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(name)) {
            return 'icon-music';
        }
        if (/\.(zip|tar|gz|rar|7z|bz2)$/.test(name)) {
            return 'icon-archive';
        }
        return 'icon-file';
    }

    // -------------------------------------------------------------------------
    // 5. Toast Notification System
    // -------------------------------------------------------------------------
    function showToast(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'icon-info';
        if (type === 'success') iconName = 'icon-check';
        if (type === 'error') iconName = 'icon-alert';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <svg class="icon"><use href="#${iconName}"/></svg>
            </div>
            <div class="toast-msg">${escapeHtml(message)}</div>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        const removeToast = () => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 250);
        };

        toast.addEventListener('click', removeToast);
        setTimeout(removeToast, duration);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // -------------------------------------------------------------------------
    // 6. Backend Health & Server Status Check
    // -------------------------------------------------------------------------
    async function checkServerStatus(manualTrigger = false) {
        const dot = elements.serverStatusPill.querySelector('.status-dot');
        dot.className = 'status-dot status-checking';
        elements.serverStatusLabel.textContent = 'Checking server...';
        
        const startTime = performance.now();
        
        // Derive base ping URL from backend upload URL
        let pingUrl = state.config.backendUrl;
        try {
            const urlObj = new URL(state.config.backendUrl);
            pingUrl = urlObj.origin + '/';
        } catch (e) {
            // invalid URL format
        }

        // Timer to detect Render cold sleep (usually takes > 5 seconds)
        const coldStartTimeout = setTimeout(() => {
            elements.serverStatusLabel.textContent = 'Waking up server...';
            elements.serverWakeupNotice.classList.remove('hidden');
        }, 3500);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            const res = await fetch(pingUrl, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors',
            });

            clearTimeout(timeoutId);
            clearTimeout(coldStartTimeout);
            elements.serverWakeupNotice.classList.add('hidden');

            const latency = Math.round(performance.now() - startTime);

            if (res.ok || res.status === 404 || res.status === 204) {
                dot.className = 'status-dot status-online';
                elements.serverStatusLabel.textContent = `Online (${latency}ms)`;
                if (manualTrigger) showToast(`Backend connected! Latency: ${latency}ms`, 'success');
            } else {
                dot.className = 'status-dot status-offline';
                elements.serverStatusLabel.textContent = `Status: ${res.status}`;
                if (manualTrigger) showToast(`Backend returned status ${res.status}`, 'error');
            }
        } catch (err) {
            clearTimeout(coldStartTimeout);
            dot.className = 'status-dot status-offline';
            elements.serverStatusLabel.textContent = 'Server Offline';
            
            if (manualTrigger) {
                showToast('Unable to connect to backend. Check URL or CORS settings.', 'error');
            }
        }
    }

    elements.serverStatusPill.addEventListener('click', () => {
        checkServerStatus(true);
    });

    // -------------------------------------------------------------------------
    // 7. Drag and Drop & File Intake
    // -------------------------------------------------------------------------
    function initDropZone() {
        const dropZone = elements.dropZone;
        const fileInput = elements.fileInput;

        // Click to open native file picker
        dropZone.addEventListener('click', () => fileInput.click());

        // Keyboard trigger for accessibility
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // Drag & Drop visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('drag-active');
            });
        });

        ['dragleave', 'dragend'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('drag-active');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-active');

            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFilesSelected(fileInput.files);
                fileInput.value = ''; // Reset so the same file can be re-selected if removed
            }
        });
    }

    function handleFilesSelected(fileList) {
        const newFiles = Array.from(fileList);
        let addedCount = 0;

        newFiles.forEach(file => {
            // Create queue item state
            const item = {
                id: generateId(),
                file: file,
                status: 'ready', // 'ready' | 'uploading' | 'completed' | 'failed' | 'aborted'
                progress: 0,
                uploadedBytes: 0,
                totalBytes: file.size,
                speedBytesPerSec: 0,
                lastLoaded: 0,
                lastTimestamp: 0,
                speedSamples: [],
                xhr: null,
                errorMsg: '',
                previewUrl: null,
            };

            // If it's an image, create a local preview object URL
            if (file.type.startsWith('image/')) {
                item.previewUrl = URL.createObjectURL(file);
            }

            state.queue.push(item);
            renderQueueItem(item);
            addedCount++;
        });

        updateQueueSummary();
        showToast(`Added ${addedCount} file${addedCount > 1 ? 's' : ''} to queue`, 'info', 2000);
    }

    // -------------------------------------------------------------------------
    // 8. Queue Management & Item DOM Rendering
    // -------------------------------------------------------------------------
    function updateQueueSummary() {
        const total = state.queue.length;
        const completed = state.queue.filter(i => i.status === 'completed').length;
        const failed = state.queue.filter(i => i.status === 'failed' || i.status === 'aborted').length;
        const ready = state.queue.filter(i => i.status === 'ready').length;
        const uploading = state.queue.filter(i => i.status === 'uploading').length;

        // Toggle Empty State vs Queue Items
        if (total === 0) {
            elements.emptyQueueState.classList.remove('hidden');
            elements.queueSummaryBadge.textContent = '0 files';
            elements.uploadAllBtn.disabled = true;
            elements.clearCompletedBtn.disabled = true;
            elements.uploadAllBtnText.textContent = 'Upload All';
            elements.overallProgressContainer.classList.add('hidden');
            return;
        }

        elements.emptyQueueState.classList.add('hidden');

        // Total payload size of all files
        const totalBytes = state.queue.reduce((acc, item) => acc + item.totalBytes, 0);
        elements.queueSummaryBadge.textContent = `${total} file${total > 1 ? 's' : ''} · ${formatBytes(totalBytes)}`;

        // Button states
        elements.clearCompletedBtn.disabled = (completed === 0 && failed === 0);
        elements.uploadAllBtn.disabled = (ready === 0 && failed === 0 && uploading === 0);

        if (uploading > 0) {
            elements.uploadAllBtnText.textContent = `Uploading (${uploading})...`;
        } else if (ready > 0) {
            elements.uploadAllBtnText.textContent = `Upload All (${ready})`;
        } else {
            elements.uploadAllBtnText.textContent = 'Upload All';
        }

        updateOverallProgress();
    }

    function updateOverallProgress() {
        const uploadingOrDone = state.queue.filter(i => i.status !== 'ready');
        if (uploadingOrDone.length === 0 || state.queue.every(i => i.status === 'ready')) {
            elements.overallProgressContainer.classList.add('hidden');
            return;
        }

        elements.overallProgressContainer.classList.remove('hidden');
        
        const totalBytes = state.queue.reduce((acc, i) => acc + i.totalBytes, 0);
        const uploadedBytes = state.queue.reduce((acc, i) => acc + (i.status === 'completed' ? i.totalBytes : i.uploadedBytes), 0);
        
        const percent = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;
        
        elements.overallProgressFill.style.width = `${percent}%`;
        elements.overallProgressPercent.textContent = `${percent}%`;
        elements.overallProgressLabel.textContent = `Uploading queue: ${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`;
    }

    function renderQueueItem(item) {
        const iconType = getFileCategoryIcon(item.file);
        
        const itemEl = document.createElement('div');
        itemEl.className = 'queue-item';
        itemEl.id = `item-${item.id}`;
        itemEl.setAttribute('role', 'listitem');

        const previewHtml = item.previewUrl
            ? `<img src="${item.previewUrl}" alt="Preview" class="item-thumbnail">`
            : `<svg class="icon"><use href="#${iconType}"/></svg>`;

        itemEl.innerHTML = `
            <div class="item-preview">
                ${previewHtml}
            </div>
            
            <div class="item-details">
                <div class="item-header">
                    <span class="item-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
                    <span class="item-status-badge badge-ready" id="badge-${item.id}">Ready</span>
                </div>
                
                <div class="item-meta">
                    <span id="size-${item.id}">${formatBytes(item.totalBytes)}</span>
                    <span class="item-meta-divider" id="divider-${item.id}">•</span>
                    <span id="speed-${item.id}">Pending</span>
                </div>
                
                <div class="item-progress-track">
                    <div class="item-progress-fill" id="fill-${item.id}" style="width: 0%;"></div>
                </div>
            </div>
            
            <div class="item-actions" id="actions-${item.id}">
                <button type="button" class="item-action-btn btn-remove" title="Remove from queue" aria-label="Remove file">
                    <svg class="icon"><use href="#icon-trash"/></svg>
                </button>
            </div>
        `;

        // Attach action handlers
        const removeBtn = itemEl.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => removeQueueItem(item.id));

        elements.queueList.appendChild(itemEl);
    }

    function updateItemDOM(item) {
        const itemEl = document.getElementById(`item-${item.id}`);
        if (!itemEl) return;

        const badge = document.getElementById(`badge-${item.id}`);
        const sizeText = document.getElementById(`size-${item.id}`);
        const speedText = document.getElementById(`speed-${item.id}`);
        const fill = document.getElementById(`fill-${item.id}`);
        const actionsContainer = document.getElementById(`actions-${item.id}`);

        // Update progress bar
        if (fill) {
            fill.style.width = `${item.progress}%`;
        }

        // Clear existing classes
        itemEl.classList.remove('status-uploading', 'status-completed', 'status-failed');

        if (item.status === 'uploading') {
            itemEl.classList.add('status-uploading');
            badge.className = 'item-status-badge badge-uploading';
            badge.textContent = `${item.progress}%`;

            const currentLoaded = formatBytes(item.uploadedBytes);
            const total = formatBytes(item.totalBytes);
            sizeText.textContent = `${currentLoaded} / ${total}`;

            const speedStr = formatSpeed(item.speedBytesPerSec);
            const etaStr = formatETA(item.etaSeconds);
            speedText.textContent = [speedStr, etaStr].filter(Boolean).join(' · ') || 'Uploading...';

            // Show cancel button
            actionsContainer.innerHTML = `
                <button type="button" class="item-action-btn btn-cancel" title="Cancel upload" aria-label="Cancel upload">
                    <svg class="icon"><use href="#icon-close"/></svg>
                </button>
            `;
            const cancelBtn = actionsContainer.querySelector('.btn-cancel');
            cancelBtn.addEventListener('click', () => cancelItemUpload(item.id));

        } else if (item.status === 'completed') {
            itemEl.classList.add('status-completed');
            badge.className = 'item-status-badge badge-completed';
            badge.innerHTML = `<svg class="icon" style="width:0.85rem;height:0.85rem"><use href="#icon-check"/></svg> Uploaded`;

            sizeText.textContent = formatBytes(item.totalBytes);
            speedText.textContent = 'Completed';
            if (fill) fill.style.width = '100%';

            actionsContainer.innerHTML = `
                <button type="button" class="item-action-btn btn-remove" title="Remove from list" aria-label="Remove item">
                    <svg class="icon"><use href="#icon-close"/></svg>
                </button>
            `;
            const removeBtn = actionsContainer.querySelector('.btn-remove');
            removeBtn.addEventListener('click', () => removeQueueItem(item.id));

        } else if (item.status === 'failed' || item.status === 'aborted') {
            itemEl.classList.add('status-failed');
            badge.className = 'item-status-badge badge-failed';
            badge.textContent = item.status === 'aborted' ? 'Cancelled' : 'Failed';

            sizeText.textContent = formatBytes(item.totalBytes);
            speedText.textContent = item.errorMsg || 'Upload failed';
            if (fill) fill.style.width = '0%';

            actionsContainer.innerHTML = `
                <button type="button" class="item-action-btn btn-retry" title="Retry upload" aria-label="Retry upload">
                    <svg class="icon"><use href="#icon-refresh"/></svg>
                </button>
                <button type="button" class="item-action-btn btn-remove" title="Remove from list" aria-label="Remove item">
                    <svg class="icon"><use href="#icon-trash"/></svg>
                </button>
            `;
            const retryBtn = actionsContainer.querySelector('.btn-retry');
            retryBtn.addEventListener('click', () => uploadSingleItem(item));

            const removeBtn = actionsContainer.querySelector('.btn-remove');
            removeBtn.addEventListener('click', () => removeQueueItem(item.id));

        } else if (item.status === 'ready') {
            badge.className = 'item-status-badge badge-ready';
            badge.textContent = 'Ready';
            sizeText.textContent = formatBytes(item.totalBytes);
            speedText.textContent = 'Ready to upload';
            if (fill) fill.style.width = '0%';

            actionsContainer.innerHTML = `
                <button type="button" class="item-action-btn btn-remove" title="Remove from queue" aria-label="Remove file">
                    <svg class="icon"><use href="#icon-trash"/></svg>
                </button>
            `;
            const removeBtn = actionsContainer.querySelector('.btn-remove');
            removeBtn.addEventListener('click', () => removeQueueItem(item.id));
        }
    }

    function removeQueueItem(id) {
        const index = state.queue.findIndex(i => i.id === id);
        if (index === -1) return;

        const item = state.queue[index];

        // Abort upload if running
        if (item.xhr) {
            try { item.xhr.abort(); } catch (e) {}
        }

        // Revoke object URL preview if created
        if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }

        // Remove from DOM
        const el = document.getElementById(`item-${id}`);
        if (el) {
            el.parentElement.removeChild(el);
        }

        // Remove from state array
        state.queue.splice(index, 1);
        updateQueueSummary();
    }

    function cancelItemUpload(id) {
        const item = state.queue.find(i => i.id === id);
        if (item && item.xhr) {
            item.xhr.abort();
            item.status = 'aborted';
            item.errorMsg = 'Upload cancelled';
            updateItemDOM(item);
            updateQueueSummary();
        }
    }

    // Clear completed / failed items
    elements.clearCompletedBtn.addEventListener('click', () => {
        const finishedItems = state.queue.filter(i => i.status === 'completed' || i.status === 'failed' || i.status === 'aborted');
        finishedItems.forEach(i => removeQueueItem(i.id));
        showToast('Cleared completed items from queue', 'info', 2000);
    });

    // -------------------------------------------------------------------------
    // 9. Upload Engine (XHR with accurate speed & ETA calculation)
    // -------------------------------------------------------------------------
    function uploadSingleItem(item) {
        return new Promise((resolve) => {
            item.status = 'uploading';
            item.progress = 0;
            item.uploadedBytes = 0;
            item.lastLoaded = 0;
            item.lastTimestamp = performance.now();
            item.speedSamples = [];
            item.speedBytesPerSec = 0;
            item.etaSeconds = 0;
            item.errorMsg = '';
            updateItemDOM(item);
            updateQueueSummary();

            const xhr = new XMLHttpRequest();
            item.xhr = xhr;

            const formData = new FormData();
            formData.append('files', item.file);

            // Optional caption
            if (state.config.caption) {
                formData.append('caption', state.config.caption);
            }

            // Tracking upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const now = performance.now();
                    const timeDelta = (now - item.lastTimestamp) / 1000; // in seconds

                    if (timeDelta >= 0.25) {
                        const bytesDelta = e.loaded - item.lastLoaded;
                        const currentSpeed = bytesDelta / timeDelta;

                        item.speedSamples.push(currentSpeed);
                        if (item.speedSamples.length > 5) item.speedSamples.shift();

                        // Smoothed average speed
                        const avgSpeed = item.speedSamples.reduce((a, b) => a + b, 0) / item.speedSamples.length;
                        item.speedBytesPerSec = avgSpeed;

                        const remainingBytes = e.total - e.loaded;
                        item.etaSeconds = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

                        item.lastLoaded = e.loaded;
                        item.lastTimestamp = now;
                    }

                    item.uploadedBytes = e.loaded;
                    item.totalBytes = e.total;
                    item.progress = Math.min(99, Math.round((e.loaded / e.total) * 100));

                    updateItemDOM(item);
                    updateOverallProgress();
                }
            });

            xhr.onload = () => {
                item.xhr = null;
                if (xhr.status >= 200 && xhr.status < 300) {
                    item.status = 'completed';
                    item.progress = 100;
                    item.uploadedBytes = item.totalBytes;
                    updateItemDOM(item);
                    updateQueueSummary();
                    showToast(`"${item.file.name}" uploaded successfully!`, 'success', 3000);
                    resolve({ success: true, item });
                } else {
                    let errMsg = `Server error (${xhr.status})`;
                    try {
                        const res = JSON.parse(xhr.responseText);
                        if (res.message) errMsg = res.message;
                    } catch (e) {}

                    item.status = 'failed';
                    item.errorMsg = errMsg;
                    updateItemDOM(item);
                    updateQueueSummary();
                    showToast(`Upload failed for "${item.file.name}": ${errMsg}`, 'error', 4500);
                    resolve({ success: false, item });
                }
            };

            xhr.onerror = () => {
                item.xhr = null;
                item.status = 'failed';
                item.errorMsg = 'Network error / CORS issue';
                updateItemDOM(item);
                updateQueueSummary();
                showToast(`Network error uploading "${item.file.name}". Check connection or settings.`, 'error', 4500);
                resolve({ success: false, item });
            };

            xhr.onabort = () => {
                item.xhr = null;
                item.status = 'aborted';
                item.errorMsg = 'Upload cancelled';
                updateItemDOM(item);
                updateQueueSummary();
                resolve({ success: false, item, aborted: true });
            };

            xhr.open('POST', state.config.backendUrl);
            xhr.send(formData);
        });
    }

    // Batch Upload: Sequential or controlled concurrency
    async function startBatchUpload() {
        if (state.isUploadingAll) return;
        state.isUploadingAll = true;

        const pendingItems = state.queue.filter(i => i.status === 'ready' || i.status === 'failed');
        if (pendingItems.length === 0) {
            state.isUploadingAll = false;
            updateQueueSummary();
            return;
        }

        elements.uploadAllBtn.disabled = true;

        // Process queue sequentially to respect Telegram bot limits and avoid timeouts
        for (const item of pendingItems) {
            if (item.status === 'ready' || item.status === 'failed') {
                await uploadSingleItem(item);
            }
        }

        state.isUploadingAll = false;
        updateQueueSummary();

        const completedCount = state.queue.filter(i => i.status === 'completed').length;
        if (completedCount === state.queue.length && state.queue.length > 0) {
            showToast('All files uploaded to Telegram channel!', 'success', 4000);
        }
    }

    elements.uploadAllBtn.addEventListener('click', startBatchUpload);

    // Form submit prevention
    elements.uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        startBatchUpload();
    });

    // -------------------------------------------------------------------------
    // 10. Settings Modal Logic
    // -------------------------------------------------------------------------
    function openSettingsModal() {
        elements.backendUrlInput.value = state.config.backendUrl;
        elements.optionalCaptionInput.value = state.config.caption;
        elements.testResultMsg.className = 'test-result-msg hidden';
        elements.testResultMsg.textContent = '';
        elements.settingsModalBackdrop.classList.remove('hidden');
        elements.backendUrlInput.focus();
    }

    function closeSettingsModal() {
        elements.settingsModalBackdrop.classList.add('hidden');
    }

    elements.openSettingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);

    elements.settingsModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.settingsModalBackdrop) {
            closeSettingsModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.settingsModalBackdrop.classList.contains('hidden')) {
            closeSettingsModal();
        }
    });

    // Preset buttons
    elements.presetRenderBtn.addEventListener('click', () => {
        elements.backendUrlInput.value = DEFAULT_BACKEND_URL;
    });

    elements.presetLocalBtn.addEventListener('click', () => {
        elements.backendUrlInput.value = 'http://localhost:3000/upload';
    });

    elements.resetSettingsBtn.addEventListener('click', () => {
        elements.backendUrlInput.value = DEFAULT_BACKEND_URL;
        elements.optionalCaptionInput.value = '';
        showToast('Settings reset to default', 'info', 2000);
    });

    // Save Settings
    elements.saveSettingsBtn.addEventListener('click', () => {
        const newUrl = elements.backendUrlInput.value.trim();
        if (!newUrl) {
            showToast('Backend URL cannot be empty', 'error');
            return;
        }

        try {
            new URL(newUrl); // validate format
        } catch (e) {
            showToast('Please enter a valid HTTP/HTTPS URL', 'error');
            return;
        }

        state.config.backendUrl = newUrl;
        state.config.caption = elements.optionalCaptionInput.value.trim();

        localStorage.setItem('tg_uploader_backend_url', state.config.backendUrl);
        localStorage.setItem('tg_uploader_caption', state.config.caption);

        closeSettingsModal();
        showToast('Configuration saved successfully!', 'success', 2500);
        checkServerStatus(false);
    });

    // Test Connection Button inside Settings
    elements.testConnectionBtn.addEventListener('click', async () => {
        const testUrl = elements.backendUrlInput.value.trim();
        const msgEl = elements.testResultMsg;

        msgEl.className = 'test-result-msg';
        msgEl.textContent = 'Testing connection...';
        msgEl.classList.remove('hidden');

        let pingUrl = testUrl;
        try {
            const urlObj = new URL(testUrl);
            pingUrl = urlObj.origin + '/';
        } catch (e) {
            msgEl.className = 'test-result-msg error';
            msgEl.textContent = 'Invalid URL format.';
            return;
        }

        const start = performance.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(pingUrl, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors',
            });
            clearTimeout(timeoutId);

            const latency = Math.round(performance.now() - start);
            if (res.ok || res.status === 204 || res.status === 404) {
                msgEl.className = 'test-result-msg success';
                msgEl.textContent = `Connection successful! Ping: ${latency}ms (Status: ${res.status})`;
            } else {
                msgEl.className = 'test-result-msg error';
                msgEl.textContent = `Server reachable but returned HTTP ${res.status}`;
            }
        } catch (err) {
            msgEl.className = 'test-result-msg error';
            msgEl.textContent = `Connection failed: ${err.message || 'Network error or sleeping server'}`;
        }
    });

    // -------------------------------------------------------------------------
    // 11. Initial Application Setup
    // -------------------------------------------------------------------------
    initTheme();
    initDropZone();
    updateQueueSummary();
    checkServerStatus(false);
});
