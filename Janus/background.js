// Janus Chrome Extension - background.js
// Final version with a bulletproof AI prompt and new debug logging.

// This function retrieves the user-saved API key from storage.
async function getApiKey() {
  return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
          // NEW: Log what we find in storage to help debug.
          console.log("Attempting to read from chrome.storage. Found:", result);
          resolve(result.apiKey);
      });
  });
}

// --- CONTEXT MENU SETUP ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
      id: "janus-analyze",
      title: "Analyze with Janus",
      contexts: ["selection"]
  });
});

// --- CONTEXT MENU EVENT LISTENER ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "janus-analyze" && info.selectionText) {
      chrome.storage.local.set({ pendingTask: info.selectionText });
  }
});

// --- MAIN MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeTask") {
      getAgentAnalysis(request.taskDescription, request.context)
          .then(result => sendResponse({ success: true, data: result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// --- AI AGENT API CALL LOGIC ---
async function getAgentAnalysis(taskDescription, context = null) {
  const apiKey = await getApiKey();
  // NEW: Log whether we found a key or not.
  console.log("API Key check complete. Key was found:", !!apiKey);

  if (!apiKey) {
      chrome.runtime.openOptionsPage();
      throw new Error("API key is not set. Please set it in the options page.");
  }
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  // FINAL, BULLETPROOF SYSTEM PROMPT
  const systemPrompt = `
  You are Janus, an expert AI tool analyst. Your goal is to provide clean, elegant, and highly relevant tool recommendations. You must be resilient and helpful.

  1.  **If the user's task is clear:** Analyze the core goal (e.g., "Image Generation") and recommend up to 5 of the best AI tools.
      **MOST IMPORTANT RULE:** You MUST NOT return an empty 'tools' array if the user's request is a clear and reasonable task. If the request is niche, you MUST broaden the category and provide tools for that broader category (e.g., for "car video edit," provide general "video editing" tools). Returning an empty list for a valid task is a failure.
      For each tool, provide a concise, single-sentence description. Your response MUST be a perfectly formatted JSON object with all strings properly escaped. Use this exact structure: \`{ "responseType": "result", "task": "Identified Task Name", "tools": [{ "name": "Tool Name", "reason": "...", "url": "https://..." }, ...] }\`

  2.  **If the user's task is ambiguous:** Do NOT recommend tools. Instead, ask a single, intelligent clarifying question. Your response MUST be a JSON object with this exact structure: \`{ "responseType": "clarification", "question": "Your clarifying question here." }\`
  `;

  const userPrompt = context
      ? `The user's initial task was: "${context.originalTask}". I asked: "${context.question}". The user has now replied: "${taskDescription}". Now, provide the final tool recommendations.`
      : `The user's task is: "${taskDescription}"`;

  const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" }
  };

  try {
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`API Error: ${response.status} - ${errorBody.error.message}`);
      }

      const data = await response.json();
      const jsonString = data.candidates[0].content.parts[0].text;
      return JSON.parse(jsonString);

  } catch (error) {
      console.error("Janus API Call Failed:", error);
      throw new Error("Failed to get a response from the AI. Check your API Key in the options.");
  }
}
