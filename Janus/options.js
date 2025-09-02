// Janus Chrome Extension - options.js
// This script handles the logic for the options page (saving the API key).

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-button');
    const apiKeyInput = document.getElementById('api-key-input');
    const statusMessage = document.getElementById('status-message');

    // Load the currently saved API key (if it exists) when the page opens.
    chrome.storage.local.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // Save the new API key when the save button is clicked.
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ apiKey: apiKey }, () => {
                // Check for errors during save
                if (chrome.runtime.lastError) {
                    statusMessage.textContent = 'Error saving key. Please try again.';
                    statusMessage.style.color = '#B91C1C'; // Error Red
                } else {
                    statusMessage.textContent = 'API Key saved successfully!';
                    statusMessage.style.color = '#16A34A'; // Success Green
                }
                
                // Make the message disappear after a few seconds
                setTimeout(() => {
                    statusMessage.textContent = '';
                    statusMessage.style.color = ''; // Reset color
                }, 3000);
            });
        } else {
            statusMessage.textContent = 'Please enter a valid API key.';
            statusMessage.style.color = '#B91C1C'; // Error Red
        }
    });
});
