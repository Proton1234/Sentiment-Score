// Initialize sentiment cache if it doesn't exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sentimentCache'], (result) => {
    if (!result.sentimentCache) {
      chrome.storage.local.set({ sentimentCache: {} });
    }
  });
});

function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.origin + url.pathname; // Remove search, hash, trailing slash
  } catch (e) {
    console.error("Failed to parse URL:", rawUrl);
    return rawUrl; // fallback
  }
}

// Analyze sentiment using GPT API
async function analyzeSentimentWithGPT(text) {
  const openaiKey = "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";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Analyze the sentiment of the following text. Return only the result in the following strict JSON format:

{
  "score": <floating-point number between 0 and 1, accurate to at least three decimal places>,
  "explanation": "<brief, specific reason based on the tone and word patterns>",
  "examples": ["<up to 3 short quotes (1-2 sentences each) that clearly reflect the overall sentiment and illustrate why the sentiment score was given>"]
}

Guidelines:
- Use the **full resolution** of the score field (e.g., 0.231, 0.783, 0.945), not rounded or bucketed into steps like 0.6 or 0.8.
- For neutral text, the score should be around 0.5 (e.g., 0.48-0.52). Only assign 0.0 for extremely negative content or 1.0 for extremely positive content.
- Aim for **realistic gradation**:
    - Slightly positive = ~0.55–0.65
    - Strongly positive = ~0.75–0.85
    - Extremely positive = 0.90+
    - Neutral = 0.48–0.52
    - Slightly negative = ~0.35–0.45
    - Strongly negative = ~0.15–0.25
    - Extremely negative = under 0.1
- Use decimal precision based on subtle differences in tone, intensity, emotional wording, sarcasm, repetition, etc.
- Explanation must mention **specific tone clues** (e.g., "enthusiastic praise," "mixed feelings," "emotional negativity").
- Do **not** include any extra text outside of the valid JSON.

Text:
"""${text}"""`
        }
      ],
      max_tokens: 200
    })
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from GPT API');
  }
  return JSON.parse(data.choices[0].message.content.trim());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle the request to get cached sentiment
  if (request.type === 'getSentimentCache') {
    const urlKey = cleanUrl(request.url);
    console.log('Received request for cached sentiment for:', urlKey);

    // Use an async immediately invoked function to manage async flow for storage retrieval
    (async () => {
      try {
        const data = await chrome.storage.local.get(["sentimentCache"]);
        const cache = data.sentimentCache || {};
        
        const cachedResult = cache[urlKey];
        console.log('Cached result found for', urlKey + ':', cachedResult);
        
        // Send the cached result back (will be undefined if not found)
        sendResponse(cachedResult);
      } catch (err) {
        console.error('Error retrieving cache for', urlKey + ':', err);
        // Send back an empty response or error indicator if cache retrieval fails
        sendResponse({ error: 'Failed to retrieve cache.' });
      }
    })();

    return true; // Indicate that we will respond asynchronously
  }

  // Handle the request to analyze text and cache (with cache check)
  if (request.type === "analyzeTextAndCache") {
    // Use an async immediately invoked function to manage async flow for analysis and caching
    (async () => {
      const urlKey = cleanUrl(request.url);
      console.log('Analyzing URL:', urlKey);

      try {
        const data = await chrome.storage.local.get(["sentimentCache"]);
        const cache = data.sentimentCache || {};

        // Check cache first for regular analysis
        if (cache[urlKey]) {
          console.log("📦 Returned cached result for:", urlKey);
          sendResponse(cache[urlKey]);
          return;
        }

        console.log("🧠 Analyzing new content for:", urlKey);
        const result = await analyzeSentimentWithGPT(request.text);
        
        // Add timestamp to the result
        result.timestamp = Date.now();
        
        cache[urlKey] = result;
        await chrome.storage.local.set({ sentimentCache: cache });
        console.log("💾 Saved new result to cache for:", urlKey);
        
        sendResponse(result);

      } catch (err) {
        console.error("❌ Analysis or caching error:", err);
        sendResponse({ error: "Analysis failed: " + err.message });
      }
    })();

    return true; // Indicate that we will respond asynchronously
  }

  // Handle the request to reanalyze text and update cache (bypassing cache check)
  if (request.type === "reanalyzeTextAndCache") {
    // Use an async immediately invoked function to manage async flow for reanalysis and cache update
    (async () => {
      const urlKey = cleanUrl(request.url);
      console.log('Reanalyzing URL:', urlKey);

      try {
        const data = await chrome.storage.local.get(["sentimentCache"]);
        const cache = data.sentimentCache || {};

        // Always analyze new content for reanalysis
        console.log("🧠 Reanalyzing content for:", urlKey);
        const result = await analyzeSentimentWithGPT(request.text);
        
        // Add timestamp to the result
        result.timestamp = Date.now();
        
        // Update cache with new result
        cache[urlKey] = result;
        await chrome.storage.local.set({ sentimentCache: cache });
        console.log("💾 Updated cache with new result for:", urlKey);
        
        sendResponse(result);

      } catch (err) {
        console.error("❌ Reanalysis or cache update error:", err);
        sendResponse({ error: "Reanalysis failed: " + err.message });
      }
    })();

    return true; // Indicate that we will respond asynchronously
  }

  return false; // Return false for messages not handled
});
