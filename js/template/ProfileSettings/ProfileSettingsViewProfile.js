import ProfileSettingsView from '~/template/ProfileSettings/ProfileSettingsView';
import { ButtonColor, ButtonStyle } from '~/template/ButtonTemplate';
import ProgressButtonTemplate from '~/template/ProgressButtonTemplate';

import TextInputTemplate, { TextInputType } from '~/template/Form/TextInputTemplate';
import Data, { EnvKey } from '~/models/Data';
import FormConstraint from '~/controllers/Form/FormConstraint';
import LabelGroup from '~/template/Form/LabelGroup';
import Theme from '~/models/Theme';

import { combineLatest } from 'rxjs/index';
import { tap, distinctUntilChanged, map, startWith, share } from 'rxjs/operators';

/**
 * Main profile setting page
 */
export default class ProfileSettingsViewProfile extends ProfileSettingsView {
    /** @override */
    constructor(data) {
        const root = <div/>,
            saveButton = new ProgressButtonTemplate({
                text: 'Save',
                color: ButtonColor.green,
                style: ButtonStyle.plain,
            });

        super(data, root, {
            button: saveButton
        });

        /**
         * Root template
         * @type {HTMLDivElement}
         */
        this.root = root;

        /**
         * Status of the current view's validation
         * @type {?Observable<boolean>}
         */
        this.observeValidation = null;

        /** @type {ButtonTemplate} */
        this.saveButton = saveButton;
    }

    /** @override */
    async didInitialLoad() {
        await super.didInitialLoad();

        const displayNameInput = new LabelGroup(
            'Name',
            new TextInputTemplate(TextInputType.Name, 'John Doe', {
                initialValue: this.user.name,
            }),
            {
                tooltip: 'This is your display name seen by everyone',
                liveConstraint: new FormConstraint()
                    .length(
                        Data.shared.envValueForKey(EnvKey.minUsernameLength),
                        Data.shared.envValueForKey(EnvKey.maxUsernameLength)
                    )
            }
        );
        displayNameInput.loadInContext(this.root);

        const emailInput = new LabelGroup(
            'Email',
            new TextInputTemplate(TextInputType.Email, 'johnd@example.com', {
                initialValue: this.user.name,
            }),
            {
                tooltip: 'This is your email which is private and only used for administrative purposes.',
                liveConstraint: new FormConstraint()
                    .or(
                        new FormConstraint().isEmail(),
                        new FormConstraint().isEmpty()
                    )
            }
        );
        emailInput.loadInContext(this.root);

        this.observeValidation = combineLatest(
            displayNameInput.observeValidation()
                .pipe(tap('a', console.log)),
            emailInput.observeValidation()
                .pipe(tap('b', console.log)),
            (...errors) => [].concat(...errors))
            .pipe(
                map(errors => errors.length === 0),
                startWith(false),
                share());


        this.observeValidation
            .pipe(
                map(isValid => !isValid),
                distinctUntilChanged())
            .subscribe(isInvalid => this.saveButton.setIsDisabled(isInvalid, 'Ensure all fields are correctly completed'))
    }
}
