
export default class PlaygroundApp {
    constructor() {
        this.practiceMaker = null;

        this.STORAGE_KEY = 'playgroundOptions';

        this.baseUrl = new URL('./', window.location.href).href;

        this.defaultOptions = {
            mode: 'PRACTICE',
            locale: 'en',
            baseUrl: this.baseUrl,
            maxQ: null,
            complexity: null,
            timer: null
        };

        this._qMap = null;

        this.options = this._loadOptions();
    }

    /**
     * Normalize a `repoUrl` option value (string, array, or nullish)
     * into a clean array of paths.
     */
    _toPathArray(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        return value ? [value] : [];
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

            const options = {
                ...this.defaultOptions,
                ...(saved ? JSON.parse(saved) : {})
            };

            // Normalize repoUrl to an array (back-compat with sessions
            // saved before multi-path support was added).
            options.repoUrl = this._toPathArray(options.repoUrl);

            return options;
        } catch (error) {
            console.warn('Unable to restore playground options:', error);
            return { ...this.defaultOptions, repoUrl: [] };
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

        document.getElementById('repoUrlInput').value = o.baseUrl ?? '';

        this._renderPathPills();
    }

    /**
     * Register UI event listeners.
     */
    _initEventListeners() {
        const modeSelect = document.getElementById('modeSelect');
        const langSelect = document.getElementById('langSelect');
        const qPathInput = document.getElementById('qPathInput');
        const qPathAddBtn = document.getElementById('qPathAddBtn');
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

        qPathInput.addEventListener('focus', () => {
            qPathInput.select();
        });

        // Clear any stale invalid-path styling as soon as the user edits.
        qPathInput.addEventListener('input', () => {
            qPathInput.classList.remove('is-invalid');
        });

        qPathAddBtn.addEventListener('click', () => {
            void this._addPath(qPathInput.value);
        });

        qPathInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void this._addPath(qPathInput.value);
            }
        });

        applyBtn.addEventListener('click', async () => {
            const maxQ = document.getElementById('maxQInput').value;
            const complexity =
                document.getElementById('complexityCmb').value;
            const timer = document.getElementById('timerInput').value;
            const baseUrl = document.getElementById('repoUrlInput').value;
            const baseUrlChanged = baseUrl !== this.options.baseUrl;

            await this._setOptions({
                baseUrl: baseUrl,
                // Paths selected under the previous base URL may not exist
                // under the new one, so drop them and let _loadQuestionPaths
                // pick a fresh default from the new source below.
                ...(baseUrlChanged ? { repoUrl: [] } : {}),
                maxQ: maxQ ? Number(maxQ) : null,
                complexity: complexity || null,
                timer: timer ? Number(timer) : null
            });

            if (baseUrlChanged) {
                await this._loadQuestionPaths();
            }

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
     * Check whether a path exists in the loaded question map,
     * walking segment by segment (same pattern QuestionLoader uses
     * server-side to resolve a repoUrl against q-map.json).
     */
    _isValidPath(path) {
        if (!this._qMap || !path) return false;

        let node = this._qMap;

        for (const segment of path.split('/').filter(Boolean)) {
            if (
                !node ||
                typeof node !== 'object' ||
                !Object.prototype.hasOwnProperty.call(node, segment)
            ) {
                return false;
            }

            node = node[segment];
        }

        return true;
    }

    /**
     * Validate and commit a path typed/selected in the input as a new pill.
     */
    async _addPath(rawPath) {
        const qPathInput = document.getElementById('qPathInput');

        const path = rawPath
            .trim()
            .replace(/^\/+/, '')
            .replace(/^data\//, '')
            .replace(/\/+$/, '');

        if (!path) return;

        if (!this._isValidPath(path)) {
            qPathInput.classList.add('is-invalid');
            return;
        }

        qPathInput.classList.remove('is-invalid');

        const current = this._toPathArray(this.options.repoUrl);

        if (current.includes(path)) {
            qPathInput.value = '';
            return;
        }

        await this._setOptions({ repoUrl: [...current, path] });
        qPathInput.value = '';
        this._renderPathPills();
    }

    /**
     * Remove a path pill and reload from the remaining paths.
     */
    async _removePath(path) {
        const remaining = this._toPathArray(this.options.repoUrl)
            .filter(existing => existing !== path);

        await this._setOptions({ repoUrl: remaining });
        this._renderPathPills();
    }

    /**
     * Render the selected question paths as removable pills.
     */
    _renderPathPills() {
        const container = document.getElementById('qPathPills');

        if (!container) return;

        container.replaceChildren();

        this._toPathArray(this.options.repoUrl).forEach(path => {
            const pill = document.createElement('span');
            pill.className =
                'badge rounded-pill text-bg-secondary d-inline-flex align-items-center gap-1';
            pill.textContent = path;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-close btn-close-white';
            removeBtn.style.fontSize = '0.55rem';
            removeBtn.setAttribute('aria-label', `Remove ${path}`);
            removeBtn.addEventListener('click', () => {
                void this._removePath(path);
            });

            pill.appendChild(removeBtn);
            container.appendChild(pill);
        });
    }

    /**
     * Load available question paths into datalist.
     */
    async _loadQuestionPaths() {
        try {
            const baseUrl = (this.options.baseUrl || this.baseUrl)
                .replace(/\/+$/, '');
            const response = await fetch(baseUrl + '/data/q-map.json');

            if (!response.ok) {
                throw new Error(
                    `Unable to load question map: ${response.status}`
                );
            }

            const data = await response.json();
            this._qMap = data;

            const paths = this._extractPaths(data);

            const datalist = document.getElementById('qPathList');

            datalist.replaceChildren();

            paths.forEach(path => {
                const option = document.createElement('option');
                option.value = path;
                datalist.appendChild(option);
            });

            // Preserve the default single-repo auto-load for sessions
            // that don't have any paths selected yet.
            if (this._toPathArray(this.options.repoUrl).length === 0 && paths[0]) {
                await this._addPath(paths[0]);
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
