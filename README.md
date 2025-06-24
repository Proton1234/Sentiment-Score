# Sentiment Score Chrome Extension

This is a Chrome extension that analyzes the sentiment of selected text using OpenAI's GPT-3.5 API and returns a score between -1 (extremely negative) and 1 (extremely positive). The result is color-coded and includes a brief explanation.

## Features

- Analyze selected text on any webpage
- Sentiment scoring based on GPT analysis
- Color-coded results with labels
- History of previous analyses is stored locally

## Scoring Guide

| Label               | Range       |
|--------------------|-------------|
| Extremely Positive | 0.85 to 1.0 |
| Strongly Positive  | 0.70 to 0.85|
| Slightly Positive  | 0.55 to 0.70|
| Neutral            | 0.45 to 0.55|
| Slightly Negative  | 0.30 to 0.45|
| Strongly Negative  | 0.15 to 0.30|
| Extremely Negative | 0.00 to 0.15|

## How It Works

1. The user selects text on a webpage.
2. The extension extracts the text and sends it to OpenAI's API.
3. The API returns a sentiment score.
4. The extension displays the result with a color and label.
5. Each analysis is stored locally for reference.

## Installation

1. Download or clone the repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable Developer Mode.
4. Click "Load unpacked" and select the folder containing the extension files.
5. Insert your OpenAI API key into `popup.js` if testing locally.
