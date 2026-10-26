
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

 
        await this.practiceMaker.ready;
        return this.practiceMaker;
    }

    destroy() {
        this.practiceMaker?.destroy();
        this.practiceMaker = null;
    }
}
