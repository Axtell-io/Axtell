import FullScreenModalTemplate from '~/template/FullScreenModalTemplate';
import ButtonTemplate, { ButtonColor, ButtonStyle } from '~/template/ButtonTemplate';
import ProgressButtonTemplate from '~/template/ProgressButtonTemplate';
import LoadingTemplate from '~/template/LoadingTemplate';
import Analytics, { EventType } from '~/models/Analytics';
import LabelGroup from '~/template/Form/LabelGroup';
import Encoding from '~/models/Encoding';
import LanguageInputTemplate from '~/template/Form/LanguageInputTemplate';
import EncodingInputTemplate from '~/template/Form/EncodingInputTemplate';
import CodeEditorTemplate from '~/template/CodeEditorTemplate';
import MarkdownTemplate from '~/template/MarkdownTemplate';
import FormConstraint from '~/controllers/Form/FormConstraint';
import { HandleUnhandledPromise } from '~/helpers/ErrorManager';
import Language from '~/models/Language';
import Answer from '~/models/Request/Answer';
import Theme from '~/models/Theme';

import { merge, combineLatest } from 'rxjs';
import { filter, first, map, share, startWith, withLatestFrom } from 'rxjs/operators';

/**
 * Instance of {@link FullScreenModalTemplate}
 */
export default class WriteAnswerTemplate extends FullScreenModalTemplate {

    /**
     * @param {Post} post - The post we're writing about
     */
    constructor(post) {
        const root = new LoadingTemplate();

        super({
            title: <span>Answering <strong>{ post.title }</strong></span>,
            body: root.unique(),
            icon: <img src={Theme.dark.imageForTheme('answer')}/>,
            submitButton: new ProgressButtonTemplate({
                text: 'Submit',
                color: ButtonColor.activeAxtell,
                style: ButtonStyle.plain
            })
        });

        /**
         * The body template
         * @type {LoadingTemplate}
         */
        this.root = root;

        /**
         * The post that we're writing on
         * @type {Post}
         */
        this.post = post;

        /**
         * These are the form elements
         * @type {LabelGroup}
         */
        this.languageInput = new LanguageInputTemplate();

        /**
         * Commentary field
         * @type {MarkdownTemplate}
         */
        this.commentary = new MarkdownTemplate({
            placeholder: 'Commentary',
            autoResize: true
        })

        /**
         * The validation observable. Only available after load
         * @type {?Observable}
         */
        this.observeValidation = null;

        /**
         * The code editor
         * @type {?LabelGroup}
         */
        this.codeEditor = null;

        /**
         * The encoding selector
         */
        this.encoding = null;
    }

    async didInitialLoad() {
        await super.didInitialLoad();

        this.codeEditor = await new CodeEditorTemplate();
        this.encoding = new EncodingInputTemplate(await Encoding.query());

        // Create labels
        const languageLabel = new LabelGroup(
            'Language',
            this.languageInput,
            {
                weight: 2,
                liveConstraint: new FormConstraint()
                    .hasValue('Choose a language')
            }
        );

        const encodingLabel = new LabelGroup(
            'Encoding',
            this.encoding,
            {
                liveConstraint: new FormConstraint()
                    .hasValue('Choose an encoding')
            }
        );

        const codeLabel = new LabelGroup(
            'Code',
            this.codeEditor
        );

        const commentaryLabel = new LabelGroup(
            'Commentary',
            this.commentary
        );

        // Load the view
        this.root.displayAlternate(
            <div>
                <div class="form-grouping form-grouping--responsive-2x">
                    { languageLabel.unique() }
                    { encodingLabel.unique() }
                </div>
                { codeLabel.unique() }
                { commentaryLabel.unique() }
            </div>
        );

        // Update syntax when language changes
        this.languageInput
            .observeValue()
            .subscribe(
                language =>
                    this.codeEditor
                        .controller
                        .setLanguage(language)
                        .catch(HandleUnhandledPromise));

        // Update encoding if applicable
        this.languageInput
            .observeValue()
            .pipe(
                filter(language => language !== null),
                map(language => language.encoding()))
            .subscribe(newEncoding => {
                this.encoding.value.next(newEncoding);
            });

        // Observe validation of all fields
        this.observeValidation = combineLatest(
            languageLabel.observeValidation(),
            codeLabel.observeValidation(),
            encodingLabel.observeValidation(),
            commentaryLabel.observeValidation(),
            // Combine is of all errors into one big error array
            (...errors) => [].concat(...errors))
            .pipe(
                // If they are no errors then that means we're good
                map(errors => errors.length === 0),
                startWith(false),
                share());

        // Disable submission button when not validated.
        this.observeValidation
            .subscribe(
                isComplete => this.submitButton.setIsDisabled(
                    !isComplete,
                    `Complete all required fields.`))

        // Handles submit click
        this.submitButton
            // When we click the submit button...
            .observeClick()
            .pipe(
                // Grab the latest values
                withLatestFrom(
                    // Of t he following items
                    combineLatest(
                        this.languageInput
                            .observeValue(),
                        this.codeEditor
                            .observeValue(),
                        this.encoding
                            .observeValue(),
                        this.commentary
                            .observeValue()),
                    // Ignore the click data
                    (click, data) => data),
                // Create an object from data
                map(([language, code, encoding, commentary]) => ({ language, code, encoding, commentary })),
                // Only able to submit once
                first())
            .subscribe(({ language, code, encoding, commentary }) => {
                this.submitButton.controller.setLoadingState(true);
                (async () => {

                    const answer = new Answer({
                        post: this.post,
                        language: language,
                        code: code,
                        encoding: encoding,
                        commentary: commentary
                    });

                    const redirectURL = await answer.run();
                    window.location.href = redirectURL;

                })().catch(HandleUnhandledPromise);
            })
    }

    didLoad() {
        super.didLoad();
        Analytics.shared.report(EventType.answerWriteOpen(this.post));
    }

    didUnload() {
        super.didUnload();
        Analytics.shared.report(EventType.answerWriteOpen(this.post));
    }

}
