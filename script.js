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
        const response = await fetch('https://your-backend-url/upload', { // Replace with your backend URL
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        responseMessage.textContent = result.message || result.error;
    } catch (error) {
        responseMessage.textContent = "An error occurred while uploading.";
    }
});
