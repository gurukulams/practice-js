(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.PracticeMaker = factory());
})(this, (function () { 'use strict';

    class PracticeMaker {
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

    return PracticeMaker;

}));
//# sourceMappingURL=practice.bundle.js.map
