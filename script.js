const form = document.getElementById('uploadForm');
const responseMessage = document.getElementById('responseMessage');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) {
        responseMessage.textContent = "Please select a file!";
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('https://telegram-uploader-backend.onrender.com/upload', { // Updated URL
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        // Update the response message based on the result
        if (result.error) {
            responseMessage.textContent = `Error: ${result.error}`;
        } else {
            responseMessage.textContent = result.message || "File uploaded successfully!";
        }
    } catch (error) {
        console.error("Upload failed:", error);
        responseMessage.textContent = "An error occurred while uploading.";
    }
});
