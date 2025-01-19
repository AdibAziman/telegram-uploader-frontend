const form = document.getElementById('uploadForm');
const responseMessage = document.getElementById('responseMessage');
const progressContainer = document.getElementById('progressContainer'); // Progress container

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    if (files.length === 0) {
        responseMessage.textContent = "Please select files!";
        return;
    }

    const formData = new FormData();

    // Append each file to formData
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });

    // Create progress bar for each file
    responseMessage.textContent = "Uploading files...";
    Array.from(files).forEach((file, index) => {
        const progress = document.createElement('div');
        progress.classList.add('progress');
        progress.id = `progress_${index}`;
        progressContainer.appendChild(progress);
    });

    try {
        const response = await fetch('https://telegram-uploader-backend.onrender.com/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            responseMessage.textContent = `Error: ${result.error}`;
        } else {
            responseMessage.textContent = result.message || "Files uploaded successfully!";
        }
    } catch (error) {
        console.error("Upload failed:", error);
        responseMessage.textContent = "An error occurred while uploading.";
    }
});
