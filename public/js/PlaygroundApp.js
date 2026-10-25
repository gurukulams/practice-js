
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
        this.practiceMaker.setEditable(false)
        await this.practiceMaker.ready;
        return this.practiceMaker;
    }

    destroy() {
        this.practiceMaker?.destroy();
        this.practiceMaker = null;
    }
}
