document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const responseMessage = document.getElementById('responseMessage');
    const queueList = document.getElementById('queueList');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) {
            responseMessage.textContent = "Please select files!";
            return;
        }

        const files = fileInput.files;
        const queue = Array.from(files);

        queue.forEach(file => {
            const queueItem = document.createElement('div');
            queueItem.classList.add('queue-item');
            queueItem.textContent = file.name;

            // Create a progress bar container
            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');

            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressContainer.appendChild(progressBar);

            // File size info
            const sizeText = document.createElement('span');
            sizeText.classList.add('size-text');
            const totalSize = (file.size / (1024 * 1024)).toFixed(2); // size in MB
            sizeText.textContent = `0 MB / ${totalSize} MB`; 
            queueItem.appendChild(progressContainer);
            queueItem.appendChild(sizeText);

            queueList.appendChild(queueItem);

            const formData = new FormData();
            formData.append('files', file);

            // Start the upload
            uploadFileToServer(formData, progressBar, queueItem, sizeText, file.size);
        });
    });

    async function uploadFileToServer(formData, progressBar, queueItem, sizeText, totalSize) {
        try {
            const response = await fetch('https://telegram-uploader-backend.onrender.com/upload', {
                method: 'POST',
                body: formData,
                // Using the XMLHttpRequest to track progress
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            // Tracking progress using XMLHttpRequest
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://telegram-uploader-backend.onrender.com/upload');
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    const uploadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
                    progressBar.style.width = `${percent}%`;
                    sizeText.textContent = `${uploadedMB} MB / ${totalMB} MB`;
                }
            });

            xhr.send(formData);

            const result = await response.json();
            if (response.ok) {
                progressBar.style.width = '100%';
                queueItem.classList.add('completed');
                queueItem.textContent = "File uploaded successfully!";
            } else {
                progressBar.style.width = '0%';
                queueItem.classList.add('failed');
                queueItem.textContent = "Upload failed!";
            }
        } catch (error) {
            console.error("Upload failed:", error);
            progressBar.style.width = '0%';
            queueItem.classList.add('failed');
            queueItem.textContent = "An error occurred!";
        }
    }
});
