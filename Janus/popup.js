// Janus Chrome Extension - popup.js
// Final version with state persistence and a clean, minimalist results view.

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & UI ELEMENTS ---
    const states = {
        input: document.getElementById('input-state'),
        loading: document.getElementById('loading-state'),
        clarification: document.getElementById('clarification-state'),
        results: document.getElementById('results-state'),
    };
    const buttons = {
        analyze: document.getElementById('analyze-button'),
        submitClarification: document.getElementById('submit-clarification-button'),
        reset: document.getElementById('reset-button'),
    };
    const inputs = {
        task: document.getElementById('task-input'),
        clarification: document.getElementById('clarification-input'),
    };
    const display = {
        errorMessage: document.getElementById('error-message'),
        aiQuestion: document.getElementById('ai-question'),
        identifiedTask: document.getElementById('identified-task'),
        toolList: document.getElementById('tool-list'),
    };

    let agentContext = null;

    // --- EVENT LISTENERS ---
    buttons.analyze.addEventListener('click', () => handleAnalysis(inputs.task.value));
    buttons.submitClarification.addEventListener('click', () => handleAnalysis(inputs.clarification.value));
    buttons.reset.addEventListener('click', resetToInitialState);

    // --- CORE FUNCTIONS ---
    function handleAnalysis(taskDescription) {
        const description = taskDescription.trim();
        if (!description) {
            showError("Please provide a description for your task.");
            return;
        }
        showState('loading');
        chrome.runtime.sendMessage(
            { action: "analyzeTask", taskDescription: description, context: agentContext },
            handleResponse
        );
    }

    function handleResponse(response) {
        if (chrome.runtime.lastError) {
            showError("Internal extension error. Try reloading.");
            showState('input');
            return;
        }
        if (response && response.success) {
            processAiResponse(response.data);
        } else {
            showError(response.error || "An unknown error occurred.");
            showState('input');
        }
    }

    function processAiResponse(data) {
        if (data.responseType === 'clarification') {
            handleClarification(data);
        } else if (data.responseType === 'result') {
            displayFinalResults(data);
        } else {
            showError("The AI returned an unexpected response format.");
            showState('input');
        }
    }

    function handleClarification(data) {
        agentContext = {
            originalTask: inputs.task.value.trim(),
            question: data.question,
        };
        display.aiQuestion.textContent = data.question;
        inputs.clarification.value = '';
        showState('clarification');
    }

    function displayFinalResults(data) {
        chrome.storage.local.set({ lastResult: data });

        display.toolList.innerHTML = '';
        display.identifiedTask.textContent = data.task || 'Analysis Complete';

        if (data.tools && data.tools.length > 0) {
            data.tools.forEach(tool => {
                const toolCard = `
                    <div class="tool-card">
                        <h4 class="tool-name">${tool.name}</h4>
                        <p class="tool-reason">${tool.reason}</p>
                        <a href="${tool.url}" target="_blank" class="visit-site-link">
                            <span>Visit Site</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                        </a>
                    </div>
                `;
                display.toolList.innerHTML += toolCard;
            });
        } else {
             display.toolList.innerHTML = `<p class="text-center text-gray-500">No specific tools were recommended for this task.</p>`;
        }
        showState('results');
    }
    
    function initializePopup() {
        chrome.storage.local.get(['pendingTask', 'lastResult'], (result) => {
            if (chrome.runtime.lastError) {
                console.warn("Could not access chrome.storage.");
                resetToInitialState();
                return;
            }
            if (result.pendingTask) {
                inputs.task.value = result.pendingTask;
                chrome.storage.local.remove('pendingTask');
                handleAnalysis(result.pendingTask);
            } else if (result.lastResult) {
                displayFinalResults(result.lastResult);
            } else {
                resetToInitialState();
            }
        });
    }

    function resetToInitialState() {
        chrome.storage.local.remove('lastResult');
        agentContext = null;
        inputs.task.value = '';
        inputs.clarification.value = '';
        showState('input');
    }

    function showState(state) {
        Object.values(states).forEach(el => el.classList.add('hidden'));
        Object.values(buttons).forEach(el => el.classList.add('hidden'));
        display.errorMessage.classList.add('hidden');
        if (states[state]) states[state].classList.remove('hidden');
        if (state === 'input') buttons.analyze.classList.remove('hidden');
        if (state === 'clarification') buttons.submitClarification.classList.remove('hidden');
        if (state === 'results') buttons.reset.classList.remove('hidden');
    }

    function showError(message) {
        display.errorMessage.textContent = message;
        display.errorMessage.classList.remove('hidden');
    }

    initializePopup();
});