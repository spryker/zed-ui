const PRESERVED_STATE_STORAGE_KEY = '__merchant_portal_dev_reload_state__';

const SKIPPED_INPUT_TYPES = new Set(['password', 'hidden', 'file']);

interface PreservedFieldState {
    selector: string;
    value: string;
    checked: boolean;
    isCheckable: boolean;
}

interface PreservedFocusState {
    selector: string;
    selectionStart: number | null;
    selectionEnd: number | null;
}

interface PreservedState {
    scrollX: number;
    scrollY: number;
    fields: PreservedFieldState[];
    focus: PreservedFocusState | null;
}

const escapeAttributeValue = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildStructuralSelector = (element: Element): string | null => {
    const segments: string[] = [];
    let current: Element | null = element;

    while (current !== null && current !== document.body) {
        if (current.id !== '') {
            segments.unshift(`#${CSS.escape(current.id)}`);

            return segments.join(' > ');
        }

        const parent: Element | null = current.parentElement;

        if (parent === null) {
            return null;
        }

        let nthOfType = 1;
        let sibling: Element | null = current.previousElementSibling;

        while (sibling !== null) {
            if (sibling.tagName === current.tagName) {
                nthOfType += 1;
            }

            sibling = sibling.previousElementSibling;
        }

        segments.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${nthOfType})`);
        current = parent;
    }

    if (current === document.body) {
        segments.unshift('body');

        return segments.join(' > ');
    }

    return null;
};

const buildSelector = (element: Element): string | null => {
    if (element.id !== '') {
        return `#${CSS.escape(element.id)}`;
    }

    const name = element.getAttribute('name');

    if (name !== null && name !== '') {
        const nameSelector = `[name="${escapeAttributeValue(name)}"]`;

        if (document.querySelectorAll(nameSelector).length === 1) {
            return nameSelector;
        }
    }

    return buildStructuralSelector(element);
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const isSkippedInput = (element: FieldElement): boolean =>
    element instanceof HTMLInputElement && SKIPPED_INPUT_TYPES.has(element.type);

const isCheckableInput = (element: FieldElement): boolean =>
    element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio');

const captureFocus = (): PreservedFocusState | null => {
    const active = document.activeElement;

    if (active === null || active === document.body) {
        return null;
    }

    const selector = buildSelector(active);

    if (selector === null) {
        return null;
    }

    let selectionStart: number | null = null;
    let selectionEnd: number | null = null;

    try {
        const textField = active as HTMLInputElement | HTMLTextAreaElement;

        if (typeof textField.selectionStart === 'number') {
            selectionStart = textField.selectionStart;
            selectionEnd = textField.selectionEnd;
        }
    } catch {
        selectionStart = null;
        selectionEnd = null;
    }

    return { selector, selectionStart, selectionEnd };
};

const captureState = (): PreservedState => {
    const fields: PreservedFieldState[] = [];
    const fieldElements = document.querySelectorAll<FieldElement>('input, textarea, select');

    for (const element of Array.from(fieldElements)) {
        if (isSkippedInput(element)) {
            continue;
        }

        const selector = buildSelector(element);

        if (selector === null) {
            continue;
        }

        const isCheckable = isCheckableInput(element);

        fields.push({
            selector,
            value: element.value,
            checked: isCheckable && (element as HTMLInputElement).checked,
            isCheckable,
        });
    }

    return {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        fields,
        focus: captureFocus(),
    };
};

export const reloadPreservingState = (): void => {
    try {
        sessionStorage.setItem(PRESERVED_STATE_STORAGE_KEY, JSON.stringify(captureState()));
    } catch {}

    window.location.reload();
};

const restoreFields = (fields: PreservedFieldState[]): void => {
    for (const field of fields) {
        const element = document.querySelector(field.selector);

        if (element === null) {
            continue;
        }

        if (field.isCheckable && element instanceof HTMLInputElement) {
            element.checked = field.checked;

            continue;
        }

        if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
        ) {
            element.value = field.value;
        }
    }
};

const restoreFocus = (focus: PreservedFocusState | null): void => {
    if (focus === null) {
        return;
    }

    const element = document.querySelector(focus.selector);

    if (!(element instanceof HTMLElement)) {
        return;
    }

    element.focus();

    if (focus.selectionStart === null || focus.selectionEnd === null) {
        return;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        try {
            element.setSelectionRange(focus.selectionStart, focus.selectionEnd);
        } catch {}
    }
};

export const restorePreservedState = (): void => {
    let serialized: string | null;

    try {
        serialized = sessionStorage.getItem(PRESERVED_STATE_STORAGE_KEY);
        sessionStorage.removeItem(PRESERVED_STATE_STORAGE_KEY);
    } catch {
        return;
    }

    if (serialized === null) {
        return;
    }

    let state: PreservedState;

    try {
        state = JSON.parse(serialized) as PreservedState;
    } catch {
        return;
    }

    restoreFields(state.fields);
    restoreFocus(state.focus);

    requestAnimationFrame(() => {
        window.scrollTo(state.scrollX, state.scrollY);
    });
};
