
// import PracticeMaker from '../src/practice.js';

export default class PlaygroundApp {
    constructor() {
        this.practiceMaker = null;
    }

    async init() {
        const container = document.getElementById('practice-main');

        if (!container) {
            throw new Error('Element #practice-main not found');
        }

        const options = {
            mode: 'PRACTICE',
            repoUrl: '/data/eduction/fundamentals/material'
        };

        this.practiceMaker = new PracticeMaker.default(container, options);

        const modeSelect = document.getElementById("modeSelect");
        modeSelect.addEventListener('change', () => {
            this.practiceMaker.mode = modeSelect.value;
        });

        const langSelect = document.getElementById("langSelect");
        langSelect.addEventListener('change', () => {
            this.practiceMaker.locale = langSelect.value;
        });

        const qPathInput = document.getElementById("qPathInput");

        qPathInput.addEventListener('blur', () => this.loadDataAndRender());
        qPathInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.practiceMaker.repoUrl = 'data/' + qPathInput.value.trim();
          }
        });

        document.getElementById('optionsApplyBtn')
            .addEventListener('click', async () => {
            const maxQ = document.getElementById('maxQInput').value;
            const complexity = document.getElementById('complexityCmb').value;
            const timer = document.getElementById('timerInput').value;
        
            await this.practiceMaker.setOptions({
                maxQ: maxQ ? Number(maxQ) : null,
                complexity: complexity || null,
                timer: timer ? Number(timer) : null
            });
        
            // Close Bootstrap modal after applying
            const modal = bootstrap.Modal.getInstance(
                document.getElementById('optionsModal')
            );
            modal?.hide();
        });
 
        await this.practiceMaker.ready;
        return this.practiceMaker;
    }

    destroy() {
        this.practiceMaker?.destroy();
        this.practiceMaker = null;
    }
}
