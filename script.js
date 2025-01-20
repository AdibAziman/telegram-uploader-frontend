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

            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');

            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressContainer.appendChild(progressBar);

            queueItem.appendChild(progressContainer);
            queueList.appendChild(queueItem);

            const formData = new FormData();
            formData.append('files', file);

            uploadFileToServer(formData, progressBar, queueItem, 3); // Retry logic added with 3 attempts
        });
    });

    async function uploadFileToServer(formData, progressBar, queueItem, retries) {
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
                throw new Error(result.message || "Unknown server error");
            }
        } catch (error) {
            console.error("Upload failed:", error);

            if (retries > 0) {
                console.log(`Retrying upload (${3 - retries + 1}/3)...`);
                uploadFileToServer(formData, progressBar, queueItem, retries - 1);
            } else {
                progressBar.style.width = '0%';
                queueItem.classList.add('failed');
                queueItem.textContent = "An error occurred!";
            }
        }
    }
});
