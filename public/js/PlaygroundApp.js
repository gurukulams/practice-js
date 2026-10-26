
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

        // Recursive function to extract all nested paths from the JSON tree
        const extractPaths = (node, prefix = '') => {
            let paths = [];
            for (const [key, value] of Object.entries(node)) {
                const currentPath = prefix ? `${prefix}/${key}` : key;
                paths.push(currentPath);
                if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                    paths = paths.concat(extractPaths(value, currentPath));
                }
            }
            return paths;
        }

        // Fetch the JSON file and populate the datalist
        fetch('/data/q-map.json')
            .then(response => response.json())
            .then(data => {
                const paths = extractPaths(data);
                const datalist = document.getElementById('qPathList');
                
                datalist.innerHTML = ''; // Clear any existing options
                
                paths.forEach(path => {
                    const option = document.createElement('option');
                    option.value = path;
                    datalist.appendChild(option);
                });
            })
            .catch(error => console.error('Error loading question map:', error));

        // Function to handle updating the repo URL and triggering a reload
        const handlePathUpdate = () => {
            const pathValue = qPathInput.value.trim();
            if (pathValue) {
                this.practiceMaker.repoUrl = 'data/' + pathValue;
            }
        };
        
        // Triggered when an option is selected from the datalist dropdown
        qPathInput.addEventListener('change', () => {
            handlePathUpdate();
        });
        
        // Triggered when focus leaves the input
        qPathInput.addEventListener('blur', () => {
            handlePathUpdate();
        });
        
        // Triggered when the user presses Enter
        qPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
            e.preventDefault();
            handlePathUpdate();
            qPathInput.blur(); // Optional: removes focus so blur doesn't fire a second time immediately
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
