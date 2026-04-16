'use strict';

// Use the pre-compiled .mjs file for best compatibility with Rollup
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

export default class PracticeMaker {
    constructor(contentRoot) {
        this.contentRoot = contentRoot;
    }

    setQuestions(_questions) {
        // 1. Inject your HTML/JSON data
        this.contentRoot.innerHTML = `<div class="questions">${JSON.stringify(_questions)}</div>`;

        // 2. Trigger the math rendering
        this.renderMath();
    }

    renderMath() {
        renderMathInElement(this.contentRoot, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }
}