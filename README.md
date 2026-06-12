# Sentiment Score Chrome Extension

## Overview

Sentiment Score is a Chrome extension that analyzes the overall sentiment of webpage content using OpenAI's GPT API. The extension extracts visible text from the current webpage, performs sentiment analysis, and presents the results through an interactive sentiment gauge, explanation, and representative examples from the analyzed content.

Results are cached locally to reduce API usage and can be reviewed later through a built-in history system.

---

## Features

* Analyze visible content from any webpage
* AI-powered sentiment analysis using OpenAI's GPT API
* Sentiment score ranging from 0.000 to 1.000
* Human-readable sentiment labels (Very Negative to Very Positive)
* AI-generated explanations describing the sentiment
* Example quote extraction from analyzed content
* Local caching to reduce redundant API requests
* Reanalyze functionality for updated page content
* Analysis history with URL management
* Interactive sentiment gauge visualization

---

## Technology Stack

### Frontend

* JavaScript
* HTML
* CSS

### Browser APIs

* Chrome Extension API
* Chrome Storage API
* Chrome Messaging API
* Chrome Scripting API

### AI Service

* OpenAI GPT API

---

## Architecture

### Content Script

Extracts visible text from the active webpage.

### Background Service Worker

Handles API communication, caching, and storage management.

### Popup Interface

Displays sentiment scores, explanations, examples, history, and visualizations.

### Local Storage

Stores cached sentiment results and analysis history.

---

## How It Works

1. The user opens the extension on a webpage.
2. The extension extracts visible text from the page.
3. The text is sent to OpenAI's GPT API for analysis.
4. GPT returns:

   * Sentiment score
   * Explanation
   * Representative examples
5. Results are displayed in the popup interface.
6. The analysis is cached locally for future access.
7. Users can reanalyze the page or review previous analyses through the history view.

---

## Sentiment Scale

| Score Range | Label         |
| ----------- | ------------- |
| 0.00 - 0.19 | Very Negative |
| 0.20 - 0.39 | Negative      |
| 0.40 - 0.60 | Neutral       |
| 0.61 - 0.80 | Positive      |
| 0.81 - 1.00 | Very Positive |

---

## Key Challenges

* Coordinating communication between content scripts, popup scripts, and the background service worker.
* Managing asynchronous API requests and Chrome extension messaging.
* Designing a caching system to reduce unnecessary API calls.
* Creating an intuitive visualization for sentiment results.

---

## What I Learned

* Browser extension architecture and lifecycle management.
* Working with asynchronous JavaScript and API communication.
* Integrating AI services into user-facing applications.
* Implementing local caching and persistent storage.
* Designing interfaces around AI-generated data.

---

## Future Improvements

* Move API communication to a dedicated backend server for improved security.
* Support analysis of selected text instead of only full-page content.
* Add sentiment trend tracking across multiple analyses.
* Support additional content sources and filtering options.

---

## Installation

1. Clone or download the repository.
2. Open Chrome and navigate to:
   chrome://extensions
3. Enable Developer Mode.
4. Click "Load unpacked."
5. Select the project folder.
6. Configure an OpenAI API key.
7. Open any webpage and launch the extension.
