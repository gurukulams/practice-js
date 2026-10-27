
export default class PlaygroundApp {
    constructor() {
        this.practiceMaker = null;

        this.STORAGE_KEY = 'playgroundOptions';

        this.defaultOptions = {
            mode: 'PRACTICE',
            locale: 'en',
            maxQ: null,
            complexity: null,
            timer: null
        };

        this.options = this._loadOptions();
    }

    async init() {
        const container = document.getElementById('practice-main');

        if (!container) {
            throw new Error('Element #practice-main not found');
        }

        // Initialize PracticeMaker with restored options.
        this.practiceMaker = new PracticeMaker.default(
            container,
            this.options
        );

        this._initFormValues();
        this._initEventListeners();
        this._loadQuestionPaths();

        await this.practiceMaker.ready;

        return this.practiceMaker;
    }

    /**
     * Single entry point for all PracticeMaker option updates.
     */
    async _setOptions(changes = {}) {
        const updatedOptions = {
            ...this.options,
            ...changes
        };

        // Avoid unnecessary reloads.
        const hasChanges = Object.keys(changes).some(
            key => this.options[key] !== updatedOptions[key]
        );

        if (!hasChanges) return;

        // Update PracticeMaker first.
        await this.practiceMaker.setOptions(changes);

        // Persist only after a successful update.
        this.options = updatedOptions;
        this._saveOptions();
    }

    /**
     * Restore options from sessionStorage.
     */
    _loadOptions() {
        try {
            const saved = sessionStorage.getItem(this.STORAGE_KEY);

            return {
                ...this.defaultOptions,
                ...(saved ? JSON.parse(saved) : {})
            };
        } catch (error) {
            console.warn('Unable to restore playground options:', error);
            return { ...this.defaultOptions };
        }
    }

    /**
     * Persist current options for page refresh.
     */
    _saveOptions() {
        try {
            sessionStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(this.options)
            );
        } catch (error) {
            console.warn('Unable to save playground options:', error);
        }
    }

    /**
     * Initialize controls using restored options.
     */
    _initFormValues() {
        const o = this.options;

        document.getElementById('modeSelect').value = o.mode;
        document.getElementById('langSelect').value = o.locale;

        document.getElementById('maxQInput').value = o.maxQ ?? '';
        document.getElementById('complexityCmb').value =
            o.complexity ?? '';
        document.getElementById('timerInput').value = o.timer ?? '';

        document.getElementById('qPathInput').value =
            o.repoUrl?.replace(/^\/?data\//, '') ?? '';
    }

    /**
     * Register UI event listeners.
     */
    _initEventListeners() {
        const modeSelect = document.getElementById('modeSelect');
        const langSelect = document.getElementById('langSelect');
        const qPathInput = document.getElementById('qPathInput');
        const applyBtn = document.getElementById('optionsApplyBtn');

        modeSelect.addEventListener('change', () => {
            void this._setOptions({
                mode: modeSelect.value
            });
        });

        langSelect.addEventListener('change', () => {
            void this._setOptions({
                locale: langSelect.value
            });
        });

        // Apply question path when selected or edited.
        const updatePath = () => {
            const path = qPathInput.value.trim();

            if (!path) return;

            const normalizedPath = path
                .replace(/^\/+/, '')
                .replace(/^data\//, '')
                .replace(/\/+$/, '');

            void this._setOptions({
                repoUrl: `/data/${normalizedPath}`
            });
        };

        qPathInput.addEventListener('change', updatePath);
        qPathInput.addEventListener('blur', updatePath);

        qPathInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                qPathInput.blur();
            }
        });

        applyBtn.addEventListener('click', async () => {
            const maxQ = document.getElementById('maxQInput').value;
            const complexity =
                document.getElementById('complexityCmb').value;
            const timer = document.getElementById('timerInput').value;

            await this._setOptions({
                maxQ: maxQ ? Number(maxQ) : null,
                complexity: complexity || null,
                timer: timer ? Number(timer) : null
            });

            const modal = bootstrap.Modal.getInstance(
                document.getElementById('optionsModal')
            );

            modal?.hide();
        });
    }

    /**
     * Recursively extract all question paths.
     */
    _extractPaths(node, prefix = '') {
        let paths = [];

        for (const [key, value] of Object.entries(node)) {
            const currentPath = prefix
                ? `${prefix}/${key}`
                : key;

            paths.push(currentPath);

            if (
                value &&
                typeof value === 'object' &&
                Object.keys(value).length > 0
            ) {
                paths.push(
                    ...this._extractPaths(value, currentPath)
                );
            }
        }

        return paths;
    }

    /**
     * Load available question paths into datalist.
     */
    async _loadQuestionPaths() {
        try {
            const response = await fetch('/data/q-map.json');

            if (!response.ok) {
                throw new Error(
                    `Unable to load question map: ${response.status}`
                );
            }

            const data = await response.json();
            const paths = this._extractPaths(data);

            const datalist = document.getElementById('qPathList');

            datalist.replaceChildren();

            paths.forEach(path => {
                const option = document.createElement('option');
                option.value = path;
                datalist.appendChild(option);
            });

            const qPathInput = document.getElementById('qPathInput');
            if(qPathInput.value.trim().length == 0) {
                qPathInput.value = paths[0];
                // Trigger the existing change event listener
                qPathInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

 

        } catch (error) {
            console.error('Error loading question map:', error);
        }
    }

    destroy() {
        this.practiceMaker?.destroy();
        this.practiceMaker = null;
    }
}
