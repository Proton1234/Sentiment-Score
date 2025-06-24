// Remove DOMContentLoaded spinner logic. Only show spinner on Analyze click.
// Add DOMContentLoaded listener to check cache on popup load

let loadingAnimationInterval = null;
let dotCount = 0;

// View management
let currentView = 'main';

// Add tooltip functionality
document.addEventListener('DOMContentLoaded', () => {
  const infoIcon = document.querySelector('.info-icon');
  const tooltip = document.querySelector('.tooltip');
  
  if (infoIcon && tooltip) {
    // Toggle tooltip on icon click
    infoIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.classList.toggle('visible');
    });

    // Hide tooltip when clicking outside
    document.addEventListener('click', (e) => {
      if (!tooltip.contains(e.target) && !infoIcon.contains(e.target)) {
        tooltip.classList.remove('visible');
      }
    });
  }

  // Add history icon click handler
  const historyIcon = document.getElementById('historyIcon');
  if (historyIcon) {
    historyIcon.addEventListener('click', () => {
      showHistoryView();
    });
  }

  // Add back button click handler
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showMainView();
    });
  }
});

// View switching functions
function showMainView() {
  currentView = 'main';
  document.getElementById('mainView').classList.add('active');
  document.getElementById('historyView').classList.remove('active');
  
  // Reset header text
  const sentimentHeader = document.getElementById('sentimentHeader');
  if (sentimentHeader) {
    sentimentHeader.textContent = 'Sentiment Score';
  }
  
  // Ensure proper button visibility
  const analyzeButton = document.getElementById('analyze');
  const reanalyzeButton = document.getElementById('reanalyze');
  const resultDiv = document.getElementById('result');
  const spinnerDiv = document.getElementById('spinner');
  
  if (analyzeButton && reanalyzeButton && resultDiv && spinnerDiv) {
    // Check if there's a cached result to determine which button to show
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        chrome.runtime.sendMessage(
          {
            type: 'getSentimentCache',
            url: tabs[0].url,
          },
          (response) => {
            if (response && response.score !== undefined && response.explanation !== undefined) {
              // Cached result exists, show reanalyze button and result
              analyzeButton.style.display = 'none';
              reanalyzeButton.style.display = 'block';
              spinnerDiv.style.display = 'none';
              resultDiv.style.display = 'block';
            } else {
              // No cached result, show analyze button
              analyzeButton.style.display = 'block';
              reanalyzeButton.style.display = 'none';
              spinnerDiv.style.display = 'none';
              resultDiv.style.display = 'none';
            }
          }
        );
      }
    });
  }
}

function showHistoryView() {
  currentView = 'history';
  document.getElementById('mainView').classList.remove('active');
  document.getElementById('historyView').classList.add('active');
  loadHistory();
}

// History management functions
function loadHistory() {
  chrome.storage.local.get(['sentimentCache'], (result) => {
    const cache = result.sentimentCache || {};
    const historyList = document.getElementById('historyList');
    
    if (Object.keys(cache).length === 0) {
      historyList.innerHTML = '<div class="empty-history">No analysis history found</div>';
      return;
    }

    const getSentimentClass = (label) => {
      switch (label) {
        case 'Very Positive': return 'sentiment-very-positive';
        case 'Positive': return 'sentiment-positive';
        case 'Neutral': return 'sentiment-neutral';
        case 'Negative': return 'sentiment-negative';
        case 'Very Negative': return 'sentiment-very-negative';
        default: return '';
      }
    };

    // Convert to array and sort by timestamp (most recent first)
    const sortedEntries = Object.entries(cache)
      .map(([url, data]) => ({
        url,
        data,
        timestamp: data.timestamp || 0 // Use 0 as fallback for entries without timestamp
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending

    const historyItems = sortedEntries
      .map((entry, index) => {
        const { url, data } = entry;
        const percent = Math.round(data.score * 100);
        const label = getLabelFromScore(data.score);
        const sentimentClass = getSentimentClass(label);
        // Show only the domain and last path segment, with full URL as tooltip
        let displayUrl = url;
        try {
          const u = new URL(url);
          let path = u.pathname;
          if (path.length > 1) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 1) {
              path = '/.../' + parts[parts.length - 1];
            }
          }
          displayUrl = u.hostname + path;
          if (displayUrl.length > 28) {
            displayUrl = displayUrl.slice(0, 24) + '...';
          }
        } catch (e) {
          if (url.length > 32) displayUrl = url.slice(0, 26) + '...';
        }
        return `
          <div class="history-item" data-url="${url}" data-index="${index}">
            <div class="history-item-content">
              <div class="history-url" title="${url}">${displayUrl}</div>
              <div class="history-score"><span class="${sentimentClass}">${percent}% - ${label}</span></div>
            </div>
            <button class="history-delete" data-url="${url}" data-index="${index}" aria-haspopup="true" aria-expanded="false">⋮</button>
            <div class="history-menu" id="historyMenu-${index}">
              <button class="history-menu-option open-url" data-url="${url}">Open URL</button>
              <button class="history-menu-option remove-history" data-url="${url}">Remove from History</button>
            </div>
          </div>
        `;
      })
      .join('');

    historyList.innerHTML = historyItems;
    
    // Dropdown menu logic
    const deleteButtons = historyList.querySelectorAll('.history-delete');
    let openMenu = null;

    deleteButtons.forEach((button, idx) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close any open menu
        if (openMenu && openMenu !== button.nextElementSibling) {
          openMenu.classList.remove('open');
          openMenu.previousElementSibling.setAttribute('aria-expanded', 'false');
        }
        const menu = button.nextElementSibling;
        const isOpen = menu.classList.contains('open');
        if (isOpen) {
          menu.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
          openMenu = null;
        } else {
          menu.classList.add('open');
          button.setAttribute('aria-expanded', 'true');
          openMenu = menu;
        }
      });
    });

    // Menu option logic
    historyList.querySelectorAll('.open-url').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        chrome.tabs.create({ url });
        if (openMenu) openMenu.classList.remove('open');
      });
    });
    historyList.querySelectorAll('.remove-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        deleteHistoryItem(url);
        if (openMenu) openMenu.classList.remove('open');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', closeAllMenus);
    function closeAllMenus(e) {
      if (openMenu && !openMenu.contains(e.target) && !openMenu.previousElementSibling.contains(e.target)) {
        openMenu.classList.remove('open');
        openMenu.previousElementSibling.setAttribute('aria-expanded', 'false');
        openMenu = null;
      }
    }
    // Clean up event on reload
    historyList.addEventListener('DOMNodeRemoved', function cleanup() {
      document.removeEventListener('click', closeAllMenus);
      historyList.removeEventListener('DOMNodeRemoved', cleanup);
    });
  });
}

function deleteHistoryItem(url) {
  chrome.storage.local.get(['sentimentCache'], (result) => {
    const cache = result.sentimentCache || {};
    delete cache[url];
    
    chrome.storage.local.set({ sentimentCache: cache }, () => {
      loadHistory(); // Reload the history list
    });
  });
}

function animateLoadingText(baseText) {
  const sentimentHeader = document.getElementById('sentimentHeader');
  if (!sentimentHeader) return;

  dotCount = (dotCount % 3) + 1;
  const dots = '.'.repeat(dotCount);
  sentimentHeader.textContent = `${baseText}${dots}`;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded. Checking cache...');

  // Initially show only the analyze button, hide spinner and result
  document.getElementById('analyze').style.display = 'block';
  document.getElementById('reanalyze').style.display = 'none';
  document.getElementById('spinner').style.display = 'none';
  document.getElementById('result').style.display = 'none';

  // Set initial header text
  const sentimentHeader = document.getElementById('sentimentHeader');
  if (sentimentHeader) {
    sentimentHeader.textContent = 'Sentiment Score';
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      console.error('Error on load: No active tab found.');
      return;
    }
    const tabId = tabs[0].id;
    const currentUrl = tabs[0].url;
    console.log('Checking cache for URL on load:', currentUrl);

    // Send message to background to get cached data
    chrome.runtime.sendMessage(
      {
        type: 'getSentimentCache',
        url: currentUrl,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting cache from background:', chrome.runtime.lastError.message);
          return;
        }

        console.log('Received cache response:', response);

        // If a cached result exists and is valid, display it
        if (response && response.score !== undefined && response.explanation !== undefined) {
          console.log('Cached result found, displaying.');
          // Hide analyze button, show reanalyze button and result
          document.getElementById('analyze').style.display = 'none';
          document.getElementById('reanalyze').style.display = 'block';
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('result').style.display = 'block';

          const sentiment = response;
          const percent = Math.round(sentiment.score * 100);
          const label = getLabelFromScore(sentiment.score);
          const explanation = sentiment.explanation;
          const examples = sentiment.examples; // Get examples
          // Determine label color class
          let labelClass = "neutral";
          if (sentiment.score <= 0.19) labelClass = "negative";
          else if (sentiment.score <= 0.39) labelClass = "negative";
          else if (sentiment.score <= 0.60) labelClass = "neutral";
          else if (sentiment.score <= 0.80) labelClass = "positive";
          else labelClass = "positive";

           document.getElementById("result").innerHTML =
            `<div class=\"sentiment-stack\">
               <span class=\"gauge-percentage\">${percent}%</span>
               <div class=\"gauge-label ${labelClass}\">${label}</div>
             </div>
             <div class=\"sentiment-gauge-container\" style=\"opacity:1;\">\n  <div class=\"sentiment-gauge\">
               <div class=\"gauge-arc\"></div>
               <div class=\"gauge-needle\"></div>
               <div class=\"gauge-needle-base\"><div class=\"gauge-needle-base-hole\"></div></div>
             </div>\n</div>
             <div class=\"reason\">Reason: ${explanation}</div>
             <div class=\"collapsible-header\" id=\"examplesHeader\">
               <span>Show example text</span>
               <div class=\"double-chevron\">
                 <div class=\"chevron-line\"></div>
                 <div class=\"chevron-line\"></div>
               </div>
             </div>
             <div class=\"collapsible-content\" id=\"examplesContent\">
               <div class=\"examples-section\">
                 <h4>Example Text:</h4>
                 <ul id=\"exampleQuotesList\"></ul>
               </div>
             </div>`;

          // Display examples if available
          if (examples && examples.length > 0) {
            const examplesHeader = document.getElementById('examplesHeader');
            if (examplesHeader) {
              examplesHeader.style.display = 'flex'; // Make header visible if examples exist
            }
            const exampleQuotesList = document.getElementById('exampleQuotesList');
            if (exampleQuotesList) {
              exampleQuotesList.innerHTML = examples.map(quote => `<li>"${quote}"</li>`).join('');
            }
          } else {
              // Hide the collapsible header if no examples
              const examplesHeader = document.getElementById('examplesHeader');
              if (examplesHeader) {
                  examplesHeader.style.display = 'none';
              }
          }

          // Set needle position immediately for cached result (no animation on load)
          const needle = document.querySelector('.gauge-needle');
          if (needle) {
            const deg = -90 + (sentiment.score * 180);
            needle.style.transform = `rotate(${deg}deg)`;
             needle.style.transition = 'none'; // No animation on load
          }
           // Set percentage color immediately
           const percentLabel = document.querySelector('.gauge-percentage');
           if(percentLabel) {
               percentLabel.style.color = getColorFromValue(sentiment.score);
           }
            // Show label immediately
           const labelDiv = document.querySelector('.gauge-label');
           if(labelDiv) {
              labelDiv.classList.add('visible');
           }

          // Set up collapsible functionality
          setupCollapsible();

        } else {
          console.log('No cached result found or result invalid. Showing analyze button.');
          // No cached result, leave button visible (default state)
          // Ensure header is Sentiment Score
           if (sentimentHeader) {
            sentimentHeader.textContent = 'Sentiment Score';
          }
           // Clear any lingering animation on load (shouldn't happen normally)
          if (loadingAnimationInterval) {
            clearInterval(loadingAnimationInterval);
            loadingAnimationInterval = null;
          }
        }
      }
    );
  });
});

document.getElementById("analyze").addEventListener("click", async () => {
  console.log('Analyze button clicked.');
  const sentimentHeader = document.getElementById('sentimentHeader');
  if (sentimentHeader) {
    sentimentHeader.textContent = 'Analyzing...'; // Initial text
  }
  document.getElementById('analyze').style.display = 'none'; // Hide analyze button
  document.getElementById('spinner').style.display = 'flex';
  document.getElementById('result').style.display = 'none';

  // Start loading animation
  dotCount = 0; // Reset dot count
  if (loadingAnimationInterval) clearInterval(loadingAnimationInterval); // Clear any previous interval
  loadingAnimationInterval = setInterval(() => animateLoadingText('Analyzing'), 500);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      console.error('Error: No active tab found.');
      document.getElementById("result").innerText = "Error: No active tab found";
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      return;
    }

    const tabId = tabs[0].id;
    const currentUrl = tabs[0].url;
    console.log('Active tab found:', currentUrl);

    // Inject the content script if it's not already there, then send message
    console.log('Attempting to inject content script...');
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["contentScript.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error injecting content script:', chrome.runtime.lastError.message);
          document.getElementById("result").innerText = "Error injecting content script: " + chrome.runtime.lastError.message;
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('result').style.display = 'block';
          return;
        }

        console.log('Content script injected. Attempting to send extractText message...');
        // Now send the message to the content script
        chrome.tabs.sendMessage(
          tabId,
          { type: "extractText" },
          (textContent) => {
            if (chrome.runtime.lastError) {
              console.error('Error extracting text:', chrome.runtime.lastError.message);
              document.getElementById("result").innerText = "Error extracting text: " + chrome.runtime.lastError.message;
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('result').style.display = 'block';
              return;
            }

            if (!textContent) {
              console.error('Error: No text content found.');
              document.getElementById("result").innerText = "Error: No text content found";
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('result').style.display = 'block';
              return;
            }

            console.log('Text extracted (' + textContent.length + ' chars). Attempting to send analyzeTextAndCache message...');
            // Now send the message to the background script
            chrome.runtime.sendMessage(
              {
                type: "analyzeTextAndCache",
                text: textContent,
                url: currentUrl,
              },
              (response) => {
                console.log('Received response from background script:', response);
                if (chrome.runtime.lastError) {
                  console.error('Error communicating with background:', chrome.runtime.lastError.message);
                  document.getElementById("result").innerText = "Error communicating with background: " + chrome.runtime.lastError.message;
                  document.getElementById('spinner').style.display = 'none';
                  document.getElementById('result').style.display = 'block';
                  return;
                }

                if (!response) {
                  console.error('Error: No response from analyzer.');
                  document.getElementById("result").innerText = "Error: No response from analyzer";
                  document.getElementById('spinner').style.display = 'none';
                  document.getElementById('result').style.display = 'block';
                  return;
                }

                if (response.error) {
                  console.error('Error from analyzer:', response.error);
                  document.getElementById("result").innerText = "Error: " + response.error;
                  // Revert header text on error and stop animation
                  if (sentimentHeader) {
                    sentimentHeader.textContent = 'Sentiment Score';
                  }
                  if (loadingAnimationInterval) {
                    clearInterval(loadingAnimationInterval);
                    loadingAnimationInterval = null;
                  }
                  document.getElementById('spinner').style.display = 'none';
                   // Decide which button to show on error - usually Analyze again
                  document.getElementById('analyze').style.display = 'block';
                  return;
                }

                console.log('Analysis successful.', response);
                // Revert header text on success and stop animation
                if (sentimentHeader) {
                  sentimentHeader.textContent = 'Sentiment Score';
                }
                if (loadingAnimationInterval) {
                  clearInterval(loadingAnimationInterval);
                  loadingAnimationInterval = null;
                }
                const sentiment = response;
                const percent = Math.round(sentiment.score * 100);
                const label = getLabelFromScore(sentiment.score);
                const explanation = sentiment.explanation;
                const examples = sentiment.examples; // Get examples
                // Determine label color class
                let labelClass = "neutral";
                if (sentiment.score <= 0.19) labelClass = "negative";
                else if (sentiment.score <= 0.39) labelClass = "negative";
                else if (sentiment.score <= 0.60) labelClass = "neutral";
                else if (sentiment.score <= 0.80) labelClass = "positive";
                else labelClass = "positive";
                document.getElementById("result").innerHTML =
                  `<div class=\"sentiment-stack\">
                     <span class=\"gauge-percentage\">0%</span>
                     <div class=\"gauge-label ${labelClass}\">${label}</div>
                   </div>
                   <div class=\"sentiment-gauge-container\" style=\"opacity:0;transition:opacity 0.7s cubic-bezier(.4,2,.6,1);\">\n  <div class=\"sentiment-gauge\">
                     <div class=\"gauge-arc\"></div>
                     <div class=\"gauge-needle\"></div>
                     <div class=\"gauge-needle-base\"><div class=\"gauge-needle-base-hole\"></div></div>
                   </div>\n</div>
                   <div class=\"reason\">Reason: ${explanation}</div>
                   <div class=\"collapsible-header\" id=\"examplesHeader\">
                     <span>Show example text</span>
                     <div class=\"double-chevron\">
                       <div class=\"chevron-line\"></div>
                       <div class=\"chevron-line\"></div>
                     </div>
                   </div>
                   <div class=\"collapsible-content\" id=\"examplesContent\">
                     <div class=\"examples-section\">
                       <h4>Example Text:</h4>
                       <ul id=\"exampleQuotesList\"></ul>
                     </div>
                   </div>`;

                // Display examples if available
                if (examples && examples.length > 0) {
                  const examplesHeader = document.getElementById('examplesHeader');
                  if (examplesHeader) {
                    examplesHeader.style.display = 'flex'; // Make header visible if examples exist
                  }
                  const examplesContentDiv = document.getElementById('examplesContent');
                  const exampleQuotesList = document.getElementById('exampleQuotesList');
                  if (examplesContentDiv && exampleQuotesList) {
                    exampleQuotesList.innerHTML = examples.map(quote => `<li>\"${quote}\"</li>`).join('');
                  }
                } else {
                    const examplesHeader = document.getElementById('examplesHeader');
                    if (examplesHeader) {
                        examplesHeader.style.display = 'none';
                    }
                }

                document.getElementById('spinner').style.display = 'none';
                document.getElementById('result').style.display = 'block';

                // Animate gauge fade-in
                setTimeout(() => {
                  const gaugeContainer = document.querySelector('.sentiment-gauge-container');
                  if (gaugeContainer) gaugeContainer.style.opacity = '1';
                }, 100);

                // Animate needle and percentage
                const needle = document.querySelector('.gauge-needle');
                const percentLabel = document.querySelector('.gauge-percentage');
                const labelDiv = document.querySelector('.gauge-label');
                if (needle && percentLabel && labelDiv) {
                  needle.style.transition = 'transform 1.5s cubic-bezier(.4,2,.6,1)';
                  // Start at far left (red, -90deg, 0%)
                  needle.style.transform = 'rotate(-90deg)';
                  let start = null;
                  const duration = 1500;
                  const finalPercent = percent;
                  const finalScore = sentiment.score;
                  function lerpColor(a, b, t) {
                    return a + (b - a) * t;
                  }
                  function getColorFromValue(val) {
                    // 0 = red, 0.5 = yellow, 1 = green
                    let r, g, b;
                    if (val < 0.5) {
                      // Red to Yellow
                      r = 217;
                      g = Math.round(48 + (204 - 48) * (val / 0.5));
                      b = 37;
                    } else {
                      // Yellow to Green
                      r = Math.round(217 + (52 - 217) * ((val - 0.5) / 0.5));
                      g = Math.round(204 + (168 - 204) * ((val - 0.5) / 0.5));
                      b = 37 + Math.round((83 - 37) * ((val - 0.5) / 0.5));
                    }
                    return `rgb(${r},${g},${b})`;
                  }
                  setTimeout(() => {
                    // Animate needle
                    const deg = -90 + (finalScore * 180);
                    needle.style.transform = `rotate(${deg}deg)`;
                    // Animate percentage and color
                    let startTime = null;
                    function animatePercent(ts) {
                      if (!startTime) startTime = ts;
                      const elapsed = ts - startTime;
                      const t = Math.min(elapsed / duration, 1);
                      const current = Math.round(finalPercent * t);
                      percentLabel.textContent = `${current}%`;
                      percentLabel.style.color = getColorFromValue(current / 100);
                      if (t < 1) {
                        requestAnimationFrame(animatePercent);
                      } else {
                        percentLabel.textContent = `${finalPercent}%`;
                        percentLabel.style.color = getColorFromValue(finalScore);
                        // Fade/slide in the label
                        labelDiv.classList.add('visible');
                        // Add glow to label
                        labelDiv.classList.add('gauge-glow');
                        setTimeout(() => {
                          labelDiv.classList.remove('gauge-glow');
                        }, 500);
                      }
                    }
                    requestAnimationFrame(animatePercent);
                  }, 300);
                }

                // Show reanalyze button after successful analysis
                document.getElementById('reanalyze').style.display = 'block';

                // Set up collapsible functionality
                setupCollapsible();
              }
            );
          }
        );
      }
    );
  });
});

// Add Reanalyze button click handler after the Analyze button handler
document.getElementById("reanalyze").addEventListener("click", async () => {
  console.log('Reanalyze button clicked.');
  const sentimentHeader = document.getElementById('sentimentHeader');
  if (sentimentHeader) {
    sentimentHeader.textContent = 'Reanalyzing...'; // Initial text
  }
  document.getElementById('spinner').style.display = 'flex';
  document.getElementById('result').style.display = 'none';
  document.getElementById('reanalyze').style.display = 'none';

  // Start loading animation
  dotCount = 0; // Reset dot count
  if (loadingAnimationInterval) clearInterval(loadingAnimationInterval); // Clear any previous interval
  loadingAnimationInterval = setInterval(() => animateLoadingText('Reanalyzing'), 500);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      console.error('Error: No active tab found.');
      document.getElementById("result").innerText = "Error: No active tab found";
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('reanalyze').style.display = 'block';
      return;
    }

    const tabId = tabs[0].id;
    const currentUrl = tabs[0].url;
    console.log('Active tab found:', currentUrl);

    // Inject the content script if it's not already there, then send message
    console.log('Attempting to inject content script...');
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["contentScript.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error injecting content script:', chrome.runtime.lastError.message);
          document.getElementById("result").innerText = "Error injecting content script: " + chrome.runtime.lastError.message;
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('result').style.display = 'block';
          document.getElementById('reanalyze').style.display = 'block';
          return;
        }

        console.log('Content script injected. Attempting to send extractText message...');
        // Now send the message to the content script
        chrome.tabs.sendMessage(
          tabId,
          { type: "extractText" },
          (textContent) => {
            if (chrome.runtime.lastError) {
              console.error('Error extracting text:', chrome.runtime.lastError.message);
              document.getElementById("result").innerText = "Error extracting text: " + chrome.runtime.lastError.message;
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('result').style.display = 'block';
              document.getElementById('reanalyze').style.display = 'block';
              return;
            }

            if (!textContent) {
              console.error('Error: No text content found.');
              document.getElementById("result").innerText = "Error: No text content found";
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('result').style.display = 'block';
              document.getElementById('reanalyze').style.display = 'block';
              return;
            }

            console.log('Text extracted (' + textContent.length + ' chars). Sending reanalyzeTextAndCache message...');
            // Use a different message type that bypasses cache
            chrome.runtime.sendMessage(
              {
                type: "reanalyzeTextAndCache", // New message type that bypasses cache
                text: textContent,
                url: currentUrl,
              },
              (response) => {
                console.log('Received response from background script:', response);
                if (chrome.runtime.lastError) {
                  console.error('Error communicating with background:', chrome.runtime.lastError.message);
                  document.getElementById("result").innerText = "Error communicating with background: " + chrome.runtime.lastError.message;
                  document.getElementById('spinner').style.display = 'none';
                  document.getElementById('result').style.display = 'block';
                  document.getElementById('reanalyze').style.display = 'block';
                  return;
                }

                if (!response) {
                  console.error('Error: No response from analyzer.');
                  document.getElementById("result").innerText = "Error: No response from analyzer";
                  document.getElementById('spinner').style.display = 'none';
                  document.getElementById('result').style.display = 'block';
                  document.getElementById('reanalyze').style.display = 'block';
                  return;
                }

                if (response.error) {
                  console.error('Error from analyzer:', response.error);
                  document.getElementById("result").innerText = "Error: " + response.error;
                  // Revert header text on error and stop animation
                  if (sentimentHeader) {
                    sentimentHeader.textContent = 'Sentiment Score';
                  }
                   if (loadingAnimationInterval) {
                    clearInterval(loadingAnimationInterval);
                    loadingAnimationInterval = null;
                  }
                  document.getElementById('spinner').style.display = 'none';
                  document.getElementById('reanalyze').style.display = 'block';
                  return;
                }

                console.log('Reanalysis successful.', response);
                // Revert header text on success and stop animation
                if (sentimentHeader) {
                  sentimentHeader.textContent = 'Sentiment Score';
                }
                if (loadingAnimationInterval) {
                  clearInterval(loadingAnimationInterval);
                  loadingAnimationInterval = null;
                }
                const sentiment = response;
                const percent = Math.round(sentiment.score * 100);
                const label = getLabelFromScore(sentiment.score);
                const explanation = sentiment.explanation;
                const examples = sentiment.examples; // Get examples
                // Determine label color class
                let labelClass = "neutral";
                if (sentiment.score <= 0.19) labelClass = "negative";
                else if (sentiment.score <= 0.39) labelClass = "negative";
                else if (sentiment.score <= 0.60) labelClass = "neutral";
                else if (sentiment.score <= 0.80) labelClass = "positive";
                else labelClass = "positive";
                document.getElementById("result").innerHTML =
                  `<div class=\"sentiment-stack\">
                     <span class=\"gauge-percentage\">0%</span>
                     <div class=\"gauge-label ${labelClass}\">${label}</div>
                   </div>
                   <div class=\"sentiment-gauge-container\" style=\"opacity:0;transition:opacity 0.7s cubic-bezier(.4,2,.6,1);\">\n  <div class=\"sentiment-gauge\">
                     <div class=\"gauge-arc\"></div>
                     <div class=\"gauge-needle\"></div>
                     <div class=\"gauge-needle-base\"><div class=\"gauge-needle-base-hole\"></div></div>
                   </div>\n</div>
                   <div class=\"reason\">Reason: ${explanation}</div>
                   <div class=\"collapsible-header\" id=\"examplesHeader\">
                     <span>Show example text</span>
                     <div class=\"double-chevron\">
                       <div class=\"chevron-line\"></div>
                       <div class=\"chevron-line\"></div>
                     </div>
                   </div>
                   <div class=\"collapsible-content\" id=\"examplesContent\">
                     <div class=\"examples-section\">
                       <h4>Example Text:</h4>
                       <ul id=\"exampleQuotesList\"></ul>
                     </div>
                   </div>`;

                // Display examples if available
                if (examples && examples.length > 0) {
                  const examplesHeader = document.getElementById('examplesHeader');
                  if (examplesHeader) {
                    examplesHeader.style.display = 'flex'; // Make header visible if examples exist
                  }
                  const examplesContentDiv = document.getElementById('examplesContent');
                  const exampleQuotesList = document.getElementById('exampleQuotesList');
                  if (examplesContentDiv && exampleQuotesList) {
                    exampleQuotesList.innerHTML = examples.map(quote => `<li>\"${quote}\"</li>`).join('');
                  }
                } else {
                    const examplesHeader = document.getElementById('examplesHeader');
                    if (examplesHeader) {
                        examplesHeader.style.display = 'none';
                    }
                }

                document.getElementById('spinner').style.display = 'none';
                document.getElementById('result').style.display = 'block';
                document.getElementById('reanalyze').style.display = 'block';

                // Animate gauge fade-in
                setTimeout(() => {
                  const gaugeContainer = document.querySelector('.sentiment-gauge-container');
                  if (gaugeContainer) gaugeContainer.style.opacity = '1';
                }, 100);

                // Animate needle and percentage
                const needle = document.querySelector('.gauge-needle');
                const percentLabel = document.querySelector('.gauge-percentage');
                const labelDiv = document.querySelector('.gauge-label');
                if (needle && percentLabel && labelDiv) {
                  needle.style.transition = 'transform 1.5s cubic-bezier(.4,2,.6,1)';
                  // Start at far left (red, -90deg, 0%)
                  needle.style.transform = 'rotate(-90deg)';
                  let start = null;
                  const duration = 1500;
                  const finalPercent = percent;
                  const finalScore = sentiment.score;
                  function lerpColor(a, b, t) {
                    return a + (b - a) * t;
                  }
                  function getColorFromValue(val) {
                    // 0 = red, 0.5 = yellow, 1 = green
                    let r, g, b;
                    if (val < 0.5) {
                      // Red to Yellow
                      r = 217;
                      g = Math.round(48 + (204 - 48) * (val / 0.5));
                      b = 37;
                    } else {
                      // Yellow to Green
                      r = Math.round(217 + (52 - 217) * ((val - 0.5) / 0.5));
                      g = Math.round(204 + (168 - 204) * ((val - 0.5) / 0.5));
                      b = 37 + Math.round((83 - 37) * ((val - 0.5) / 0.5));
                    }
                    return `rgb(${r},${g},${b})`;
                  }
                  setTimeout(() => {
                    // Animate needle
                    const deg = -90 + (finalScore * 180);
                    needle.style.transform = `rotate(${deg}deg)`;
                    // Animate percentage and color
                    let startTime = null;
                    function animatePercent(ts) {
                      if (!startTime) startTime = ts;
                      const elapsed = ts - startTime;
                      const t = Math.min(elapsed / duration, 1);
                      const current = Math.round(finalPercent * t);
                      percentLabel.textContent = `${current}%`;
                      percentLabel.style.color = getColorFromValue(current / 100);
                      if (t < 1) {
                        requestAnimationFrame(animatePercent);
                      } else {
                        percentLabel.textContent = `${finalPercent}%`;
                        percentLabel.style.color = getColorFromValue(finalScore);
                        // Fade/slide in the label
                        labelDiv.classList.add('visible');
                        // Add glow to label
                        labelDiv.classList.add('gauge-glow');
                        setTimeout(() => {
                          labelDiv.classList.remove('gauge-glow');
                        }, 500);
                      }
                    }
                    requestAnimationFrame(animatePercent);
                  }, 300);
                }

                // Set up collapsible functionality
                setupCollapsible();
              }
            );
          }
        );
      }
    );
  });
});

// New function for collapsible logic
function setupCollapsible() {
  const examplesHeader = document.getElementById('examplesHeader');
  const examplesContent = document.getElementById('examplesContent');
  const arrowIcon = examplesHeader ? examplesHeader.querySelector('.double-chevron') : null;

  if (examplesHeader && examplesContent && arrowIcon) {
    // Ensure the top arrow starts in the correct (downward) orientation. Rely solely on CSS class for rotation.
    arrowIcon.classList.remove('rotated');

    const cardContainer = document.querySelector('.card');

    // Create bottom chevron if it doesn't exist
    let bottomChevron = examplesContent.querySelector('.bottom-chevron');
    if (!bottomChevron) {
      bottomChevron = document.createElement('div');
      bottomChevron.className = 'bottom-chevron';
      const chevronContent = document.createElement('div');
      chevronContent.className = 'double-chevron';
      chevronContent.innerHTML = `
        <div class="chevron-line"></div>
        <div class="chevron-line"></div>
      `;
      bottomChevron.appendChild(chevronContent);
      examplesContent.appendChild(bottomChevron);

      // Explicitly set cursor style in JavaScript
      bottomChevron.style.cursor = 'pointer';
    }

    examplesHeader.onclick = () => {
      const isExpanding = !examplesContent.classList.contains('expanded');
      examplesContent.classList.toggle('expanded');
      
      const bottomArrowIcon = bottomChevron.querySelector('.double-chevron');

      if (isExpanding) {
        // Scroll to the bottom AFTER the content has fully expanded
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 500);

        // When expanding:
        // 1. Ensure top arrow points down, then fade out and hide
        arrowIcon.classList.remove('rotated'); // Ensure it points down before hiding
        arrowIcon.style.opacity = '0';
        setTimeout(() => {
          arrowIcon.style.display = 'none';
        }, 300); // Allow time for fade out

        // 2. Show bottom chevron and make it point up
        bottomChevron.classList.add('visible');
        bottomArrowIcon.classList.add('rotated'); // Bottom arrow points up

      } else {
        // Scroll to the top of the popup container immediately when collapsing starts
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // When collapsing:
        // 1. Ensure bottom arrow points down and hide it
        bottomArrowIcon.classList.remove('rotated'); // Bottom arrow points down
        bottomChevron.classList.remove('visible');

        // 2. Show top arrow, ensure it points down, and fade in
        arrowIcon.style.display = 'flex'; // Make it visible
        arrowIcon.classList.remove('rotated'); // Ensure it points down upon reappearance
        setTimeout(() => {
          arrowIcon.style.opacity = '1';
        }, 10); // Small delay to ensure display:flex applies before opacity transition
      }
    };

    // Add click handler for bottom chevron
    bottomChevron.onclick = (e) => {
      e.stopPropagation(); // Prevent event from bubbling to header
      examplesHeader.click(); // Trigger the same behavior as header click
    };
  }
}

function getLabelFromScore(score) {
  if (score <= 0.19) return "Very Negative";
  if (score <= 0.39) return "Negative";
  if (score <= 0.60) return "Neutral";
  if (score <= 0.80) return "Positive";
  return "Very Positive";
}

function getColorFromValue(val) {
  // 0 = red, 0.5 = yellow, 1 = green
  let r, g, b;
  if (val < 0.5) {
    // Red to Yellow
    r = 217;
    g = Math.round(48 + (204 - 48) * (val / 0.5));
    b = 37;
  } else {
    // Yellow to Green
    r = Math.round(217 + (52 - 217) * ((val - 0.5) / 0.5));
    g = Math.round(204 + (168 - 204) * ((val - 0.5) / 0.5));
    b = 37 + Math.round((83 - 37) * ((val - 0.5) / 0.5));
  }
  return `rgb(${r},${g},${b})`;
}

function getColorFromScore(score) {
  if (score <= 0.19) return "#d93025"; // Red
  if (score <= 0.39) return "#ea4335"; // Light Red
  if (score <= 0.60) return "#e6c200"; // Yellow (Updated to match UI) // Using the neutral yellow from CSS
  if (score <= 0.80) return "#34a853"; // Light Green
  return "#0f9d58"; // Green
}

const analyzeSentimentWithGPT = async (text) => {
  const apiKey = ""; // your real API key here
  const endpoint = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Analyze the sentiment of the following text. Return only the result in the following strict JSON format:

{
  "score": <floating-point number between 0 and 1, accurate to at least three decimal places>,
  "explanation": "<brief, specific reason based on the tone and word patterns>"
}

Guidelines:
- Use the **full resolution** of the score field (e.g., 0.231, 0.783, 0.945), not rounded or bucketed into steps like 0.6 or 0.8.
- Only assign clean 0.0, 0.5, or 1.0 in extreme edge cases (clear hostility, emotionless facts, or overwhelming praise).
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
"""${text}"""`,
        },
      ],
      max_tokens: 100,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content && JSON.parse(data.choices[0].message.content.trim());
};