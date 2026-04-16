'use strict';

export default class PracticeMaker {
    constructor(contentRoot) {
        this.contentRoot = contentRoot;
        this.contentRoot.innerHTML = '<div class="spinner-border" role="status"></div>';
    }

    setQuestions(_questions) {
        // For debugging/printing the JSON structure to the screen
        this.contentRoot.innerHTML = `
            <div class="card mt-3">
                <div class="card-header">Loaded ${_questions.length} Questions</div>
                <div class="card-body">
                    <pre><code>${JSON.stringify(_questions, null, 2)}</code></pre>
                </div>
            </div>
        `;
    }
}