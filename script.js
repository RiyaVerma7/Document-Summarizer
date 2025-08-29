let selectedFile = null;
let extractedText = '';
let summary = '';
let improvementSuggestions = '';
let loading = false;
let error = '';
let summaryLength = 'medium';
let isExtracting = false;
let isGeneratingSummary = false;
let isGeneratingSuggestions = false;

const appRoot = document.getElementById('app-root');
let fileInput;
let uploadSection;
let errorContainer;
let extractButton;
let summaryLengthSelect;
let generateSummaryButton;
let generateSuggestionsButton;
let extractedTextResult;
let summaryResult;
let suggestionsResult;

function updateUI() {
    if (uploadSection) {
        if (selectedFile) {
            uploadSection.classList.add('has-file');
            document.querySelector('.selected-file-info').innerHTML = `
                <span style="margin-right: 0.5rem;">📁</span> Selected: ${selectedFile.name}
            `;
        } else {
            uploadSection.classList.remove('has-file');
            const selectedFileInfo = document.querySelector('.selected-file-info');
            if (selectedFileInfo) selectedFileInfo.innerHTML = '';
        }
    }

    if (errorContainer) {
        errorContainer.style.display = error ? 'block' : 'none';
        if (error) {
            errorContainer.innerHTML = `
                <strong>Oops! 🚨</strong>
                <span style="display: block;">${error}</span>
            `;
        }
    }

    const currentLoading = isExtracting || isGeneratingSummary || isGeneratingSuggestions;

    if (extractButton) {
        extractButton.disabled = !selectedFile || currentLoading;
        extractButton.innerHTML = isExtracting
            ? `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Extracting Text...`
            : 'Extract Text';
    }

    if (summaryLengthSelect) {
        summaryLengthSelect.disabled = currentLoading || !extractedText;
        summaryLengthSelect.value = summaryLength;
    }

    if (generateSummaryButton) {
        generateSummaryButton.disabled = !extractedText || currentLoading;
        generateSummaryButton.innerHTML = isGeneratingSummary
            ? `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Summarizing...`
            : 'Generate Summary';
    }

    if (generateSuggestionsButton) {
        generateSuggestionsButton.disabled = !extractedText || currentLoading;
        generateSuggestionsButton.innerHTML = isGeneratingSuggestions
            ? `<svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Getting Suggestions...`
            : 'Get Suggestions';
    }

    if (extractedTextResult) {
        extractedTextResult.parentElement.style.display = extractedText ? 'block' : 'none';
        extractedTextResult.textContent = extractedText;
    }
    if (summaryResult) {
        summaryResult.parentElement.style.display = summary ? 'block' : 'none';
        summaryResult.innerHTML = '';
        if (summary) {
            renderSummaryWithHighlighting(summary, summaryResult);
        }
    }
    if (suggestionsResult) {
        suggestionsResult.parentElement.style.display = improvementSuggestions ? 'block' : 'none';
        suggestionsResult.innerHTML = '';
        if (improvementSuggestions) {
            renderSuggestionsAsList(improvementSuggestions, suggestionsResult);
        }
    }
}

async function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        extractedText = '';
        summary = '';
        improvementSuggestions = '';
        error = '';
        updateUI();
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files[0];
    if (file) {
        selectedFile = file;
        extractedText = '';
        summary = '';
        improvementSuggestions = '';
        error = '';
        updateUI();
    }
}

async function extractTextFromFile() {
    if (!selectedFile) {
        error = 'Please select a file first to extract text.';
        updateUI();
        return;
    }

    isExtracting = true;
    error = '';
    extractedText = '';
    summary = '';
    improvementSuggestions = '';
    updateUI();

    try {
        const fileType = selectedFile.type;
        let text = '';

        if (fileType === 'application/pdf') {
            if (!window.pdfjsLib) {
                error = 'PDF.js library not loaded. Please ensure you have an active internet connection.';
                isExtracting = false;
                updateUI();
                return;
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const pdfData = new Uint8Array(e.target.result);
                    const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
                    let fullText = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        fullText.push(content.items.map(item => item.str).join(' '));
                    }
                    text = fullText.join('\n');
                    extractedText = text;
                } catch (pdfError) {
                    console.error('Error during PDF text extraction:', pdfError);
                    error = `Failed to extract text from PDF: ${pdfError.message}`;
                } finally {
                    isExtracting = false;
                    updateUI();
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        } else if (fileType.startsWith('image/')) {
            if (!window.Tesseract) {
                error = 'Tesseract.js library not loaded. Please ensure you have an active internet connection.';
                isExtracting = false;
                updateUI();
                return;
            }
            const { data: { text: ocrText } } = await window.Tesseract.recognize(
                selectedFile,
                'eng',
                { logger: m => console.log(m) }
            );
            text = ocrText;
            extractedText = text;
            isExtracting = false;
            updateUI();
        } else {
            error = 'Unsupported file type. Please upload a PDF or an image file (e.g., JPG, PNG).';
            isExtracting = false;
            updateUI();
        }
    } catch (err) {
        console.error('Error during text extraction:', err);
        error = `An unexpected error occurred during text extraction: ${err.message}`;
        isExtracting = false;
        updateUI();
    }
}

async function generateSummary() {
    if (!extractedText) {
        error = 'No text has been extracted yet to summarize.';
        updateUI();
        return;
    }

    isGeneratingSummary = true;
    summary = '';
    error = '';
    updateUI();

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let mockSummary = "";
    const sentences = extractedText.match(/[^.!?]+[.!?]+/g) || [];
    const numSentences = sentences.length;

    if (numSentences === 0) {
        mockSummary = "No extractable text to summarize.";
    } else {
        let selectedSentences = [];
        let count;

        if (summaryLength === 'short') {
            count = Math.min(3, numSentences);
        } else if (summaryLength === 'medium') {
            count = Math.min(6, numSentences);
        } else { // long
            count = Math.min(10, numSentences);
        }

        if (numSentences > 0) selectedSentences.push(sentences[0]);
        if (numSentences > 1 && numSentences > count / 2) selectedSentences.push(sentences[Math.floor(numSentences / 2)]);
        if (numSentences > 2 && numSentences > count) selectedSentences.push(sentences[numSentences - 1]);

        let uniqueSentences = Array.from(new Set(selectedSentences));
        let remainingSentences = sentences.filter(s => !uniqueSentences.includes(s));
        
        while (uniqueSentences.length < count && remainingSentences.length > 0) {
            const randomIndex = Math.floor(Math.random() * remainingSentences.length);
            uniqueSentences.push(remainingSentences[randomIndex]);
            remainingSentences.splice(randomIndex, 1);
        }

        selectedSentences = uniqueSentences.slice(0, count);
        
        let finalSummaryParts = [];
        const keyPhrasesToHighlight = [
            "main idea", "key aspect", "important point", "core concept", "primary focus",
            "significant finding", "crucial element", "major challenge", "effective solution",
            "overall result", "study shows", "research indicates", "future implications",
            "strategic goal", "key benefit", "critical factor", "essential component",
            "fundamental principle", "major implication", "key takeaway", "critical analysis",
            "primary objective", "key finding", "demonstrates that", "suggests that", "highlights the need",
            "crucial role", "significant impact", "potential benefits", "major obstacle", "novel approach",
            "current state", "future outlook", "historical context", "methodology used", "data analysis",
            "key recommendations", "actionable insights", "proposed solution", "critical evaluation",
            "understanding of", "impact of", "role of", "development of", "challenges in", "opportunities for"
        ];
        const keywordsToHighlight = [
            "important", "key", "main", "focus", "result", "benefit", "challenge", "solution",
            "impact", "effect", "data", "analysis", "study", "research", "development", "future",
            "innovation", "growth", "success", "failure", "principle", "implication", "takeaway",
            "objective", "finding", "role", "obstacle", "approach", "demonstrates", "suggests", "highlights",
            "current", "outlook", "context", "methodology", "recommendations", "insights", "proposed",
            "evaluation", "understanding", "opportunities", "critical", "significant", "crucial", "essential",
            "primary", "major", "fundamental", "novel", "effective", "overall"
        ];

        selectedSentences.forEach(sentence => {
            let processedSentence = sentence.trim();
            let boldedSegments = []; 
            
            const safeReplace = (text, regex) => {
                return text.replace(regex, (match, p1, offset, string) => {
                    const isAlreadyBolded = boldedSegments.some(segment => 
                        offset >= segment.start && offset + match.length <= segment.end
                    );
                    if (isAlreadyBolded) {
                        return match;
                    } else {
                        boldedSegments.push({ start: offset, end: offset + match.length + 4 }); 
                        return `**${p1}**`;
                    }
                });
            };

            for (const phrase of keyPhrasesToHighlight) {
                const regex = new RegExp(`\\b(${phrase})\\b`, 'gi');
                processedSentence = safeReplace(processedSentence, regex);
            }

            for (const keyword of keywordsToHighlight) {
                const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
                processedSentence = safeReplace(processedSentence, regex);
            }
            finalSummaryParts.push(processedSentence);
        });

        mockSummary = finalSummaryParts.join(' ').trim();
    }
    
    summary = mockSummary || "Could not generate a summary from the provided text.";
    isGeneratingSummary = false;
    updateUI();
}

async function generateImprovementSuggestions() {
    if (!extractedText) {
        error = 'No document content available to generate suggestions from.';
        updateUI();
        return;
    }

    isGeneratingSuggestions = true;
    improvementSuggestions = '';
    error = '';
    updateUI();

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let mockSuggestions = "";
    const numWords = extractedText.split(/\s+/).filter(word => word.length > 0).length;

    if (numWords < 50) {
        mockSuggestions = `
* Consider expanding the content with more detailed information.
* Add an introductory paragraph to set the context for the reader.
* Include a clear concluding statement to summarize key takeaways.
* Provide specific examples to illustrate any abstract concepts.
        `.trim();
    } else if (numWords < 300) {
        mockSuggestions = `
* Review the document for overall clarity and conciseness across sections.
* Ensure smooth and logical transitions between paragraphs and sections.
* Check for consistent terminology and phrasing throughout the text.
* Break down any overly long or complex sentences for better readability.
* Add specific data or evidence to support claims where appropriate.
        `.trim();
    } else {
        mockSuggestions = `
* Evaluate the document's overall structure and flow for maximum impact.
* Condense lengthy sections into more digestible parts without losing meaning.
* Verify the accuracy and currency of all facts, figures, and external references.
* Explore opportunities for incorporating visual aids suchs as charts, graphs, or diagrams.
* Ensure the generated summary accurately reflects the most critical points of the entire document.
* Refine the language to enhance precision, impact, and to eliminate any redundancy.
* Consider adding an executive summary if the document is very extensive.
        `.trim();
    }
    
    improvementSuggestions = mockSuggestions;
    isGeneratingSuggestions = false;
    updateUI();
}

function renderSummaryWithHighlighting(text, targetElement) {
    if (!text || !targetElement) return;
    targetElement.innerHTML = '';

    const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
    parts.forEach(part => {
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            const innerText = part.substring(2, part.length - 2);
            const span = document.createElement('span');
            span.className = 'highlighted-text';
            span.textContent = innerText;
            targetElement.appendChild(span);
        } else {
            targetElement.appendChild(document.createTextNode(part));
        }
    });
}

function renderSuggestionsAsList(suggestionsText, targetElement) {
    if (!suggestionsText || !targetElement) return;
    targetElement.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'suggestions-list';

    const items = suggestionsText.split('\n')
                                 .filter(line => line.trim() !== '')
                                 .map(line => line.replace(/^(\*|-)\s*/, '').trim());

    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
    });
    targetElement.appendChild(ul);
}

document.addEventListener('DOMContentLoaded', () => {
    appRoot.innerHTML = `
        <div class="app-container">
            <div class="main-card">
                <h1 class="main-title">
                    Note Summary 📄
                </h1>
                <p class="subtitle">
                    Effortlessly upload your PDF or image documents to generate insightful summaries and receive valuable improvement suggestions.
                </p>

                <div id="upload-section" class="upload-section">
                    <input type="file" id="file-input" accept=".pdf,image/*" class="file-input" />
                    <svg class="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p class="upload-text-main">Drag & Drop your file, or <span class="upload-text-link">click to browse</span></p>
                    <p class="upload-text-support">Supported: PDF, JPG, PNG, GIF (Max 10MB recommended)</p>
                    <p class="selected-file-info"></p>
                </div>

                <div id="error-message" class="error-message" style="display: none;"></div>

                <div class="action-buttons-container">
                    <button id="extract-button" class="action-button">Extract Text</button>

                    <div class="select-container">
                        <label htmlFor="summary-length" class="sr-only">Summary Length</label>
                        <select id="summary-length-select" class="summary-length-select">
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                        <button id="generate-summary-button" class="action-button">Generate Summary</button>
                    </div>

                    <button id="generate-suggestions-button" class="action-button">Get Suggestions</button>
                </div>

                <div class="results-display-section">
                    <div class="result-card extracted-text" style="display: none;">
                        <h2 class="result-card-title">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Extracted Text
                        </h2>
                        <div id="extracted-text-result" class="result-content prose-style"></div>
                    </div>

                    <div class="result-card summary" style="display: none;">
                        <h2 class="result-card-title">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Summary
                        </h2>
                        <div id="summary-result" class="result-content prose-style"></div>
                    </div>

                    <div class="result-card suggestions" style="display: none;">
                        <h2 class="result-card-title">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Improvement Suggestions
                        </h2>
                        <div id="suggestions-result" class="result-content prose-style"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    fileInput = document.getElementById('file-input');
    uploadSection = document.getElementById('upload-section');
    errorContainer = document.getElementById('error-message');
    extractButton = document.getElementById('extract-button');
    summaryLengthSelect = document.getElementById('summary-length-select');
    generateSummaryButton = document.getElementById('generate-summary-button');
    generateSuggestionsButton = document.getElementById('generate-suggestions-button');
    extractedTextResult = document.getElementById('extracted-text-result');
    summaryResult = document.getElementById('summary-result');
    suggestionsResult = document.getElementById('suggestions-result');

    fileInput.addEventListener('change', handleFileChange);
    uploadSection.addEventListener('dragover', handleDragOver);
    uploadSection.addEventListener('drop', handleDrop);
    uploadSection.addEventListener('click', () => fileInput.click());
    extractButton.addEventListener('click', extractTextFromFile);
    summaryLengthSelect.addEventListener('change', (e) => {
        summaryLength = e.target.value;
        updateUI();
    });
    generateSummaryButton.addEventListener('click', generateSummary);
    generateSuggestionsButton.addEventListener('click', generateImprovementSuggestions);

    updateUI();
});

function loadScript(src, id, onloadCallback) {
    if (document.getElementById(id)) {
        if (onloadCallback) onloadCallback();
        return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.onload = onloadCallback;
    script.onerror = () => {
        error = `Failed to load script: ${src}. Please check your internet connection or try again.`;
        updateUI();
    };
    document.head.appendChild(script);
}

function loadPdfJs() {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js', 'pdfjs', () => {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    });
}

function loadTesseractJs() {
    loadScript('https://unpkg.com/tesseract.js@5.0.3/dist/tesseract.min.js', 'tesseractjs');
}

window.onload = () => {
    loadPdfJs();
    loadTesseractJs();
};