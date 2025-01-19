document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const responseMessage = document.getElementById('responseMessage');
    const queueList = document.getElementById('queueList'); // Ensure this element is retrieved correctly

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

            queueItem.appendChild(progressContainer);
            queueList.appendChild(queueItem);

            const formData = new FormData();
            formData.append('files', file);

            uploadFileToServer(formData, progressBar, queueItem);
        });
    });

    async function uploadFileToServer(formData, progressBar, queueItem) {
        try {
            const response = await fetch('https://telegram-uploader-backend.onrender.com/upload', {
                method: 'POST',
                body: formData,
            });

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
