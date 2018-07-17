import MarkdownViewController from '~/controllers/MarkdownViewController';
import Template from '~/template/Template';

const minHeight = 16 * 8; // line-height * lines
const reflowTargets = new Set();

window.addEventListener("resize", () => {
    for (const target of reflowTargets) {
        target.reflow();
    }
})

/**
 * Markdown editor
 */
export default class MarkdownTemplate extends Template {
    /**
     * Markdown editor
     */
    constructor(title) {
        const textarea = <textarea class="markdown text-base"></textarea>;

        super(
            <div class="markdown-wrapper">{textarea}</div>
        );

        this.defineLinkedInput('value', textarea);

        /** @type {MarkdownViewController} */
        this.controller = new MarkdownViewController(textarea);

        this._textarea = textarea;
        this._autoresize = false;
        this._onInput = null;
    }

    get input() { return this._textarea }

    /** @type {boolean} */
    get autoresize() { return this._autoresize }

    /** @type {boolean} */
    set autoresize(shouldAutoresize) {
        this._autoresize = shouldAutoresize;
        if (shouldAutoresize) {
            this._onInput = () => { this.reflow() };
            this._textarea.addEventListener("input", this._onInput);
        } else {
            if (this._onInput) {
                this._textarea.removeEventListener("input", this._onInput);
                this._onInput = null;
            }
        }
    }

    /** @override */
    didLoad() {
        this.reflow();
    }

    /**
     * Re-determines dimensions etc.
     */
    reflow() {
        if (this.autoresize) {
            this._textarea.style.height = "";
            this._textarea.style.height = `${Math.max(this._textarea.scrollHeight, minHeight)}px`;
        }
    }
}
