import {
    assertInternal,
    assertMarked,
    assertUnmarked,
    INTERNAL_VALIDATION_ENABLED,
    mark,
    unmark,
} from '../src/internalValidation';

const expectThrowInValidationOnly = (cb: () => void): void => {
    if (INTERNAL_VALIDATION_ENABLED) {
        expect(cb).toThrow();
    } else {
        expect(cb).not.toThrow();
    }
};

describe('Internal Validation Assertions', () => {
    it('Never triggers on a passing test', () => {
        expect(() => assertInternal(true)).not.toThrow();
    });

    it('Does not trigger unless validation is enabled', () => {
        if (!INTERNAL_VALIDATION_ENABLED) {
            expect(() => assertInternal(false)).not.toThrow();
        }
    });

    it('Triggers if validation is enabled', () => {
        if (INTERNAL_VALIDATION_ENABLED) {
            expect(() => assertInternal(false)).toThrow();
        }
    });
});

describe('Object Marking', () => {
    it('Marks correctly', () => {
        const x = { aaa: 'hello' };

        expectThrowInValidationOnly(() => assertMarked(x, 'hi'));
        expect(() => assertUnmarked(x, 'hi')).not.toThrow();

        mark(x, 'hi');
        expect(() => assertMarked(x, 'hi')).not.toThrow();
        expectThrowInValidationOnly(() => assertUnmarked(x, 'hi'));

        unmark(x, 'hi');
        expectThrowInValidationOnly(() => assertMarked(x, 'hi'));
        expect(() => assertUnmarked(x, 'hi')).not.toThrow();
    });

    it('Marks recursively', () => {
        const x = { aaa: 'hello' };

        expectThrowInValidationOnly(() => assertMarked(x, 'hi'));
        expect(() => assertUnmarked(x, 'hi')).not.toThrow();

        mark(x, 'hi');
        expect(() => assertMarked(x, 'hi')).not.toThrow();
        expectThrowInValidationOnly(() => assertUnmarked(x, 'hi'));

        mark(x, 'hi');
        expect(() => assertMarked(x, 'hi')).not.toThrow();
        expectThrowInValidationOnly(() => assertUnmarked(x, 'hi'));

        unmark(x, 'hi');
        expect(() => assertMarked(x, 'hi')).not.toThrow();
        expectThrowInValidationOnly(() => assertUnmarked(x, 'hi'));

        unmark(x, 'hi');
        expectThrowInValidationOnly(() => assertMarked(x, 'hi'));
        expect(() => assertUnmarked(x, 'hi')).not.toThrow();
    });

    it('Does not comflict with object', () => {
        const x = { aaa: 'hello' };

        mark(x, 'aaa');
        expect(x.aaa).toBe('hello');

        unmark(x, 'aaa');
        expect(x.aaa).toBe('hello');
    });

    it('Triggers an error on underflow', () => {
        const x = { aaa: 'hello' };

        expectThrowInValidationOnly(() => unmark(x, 'hi'));
    });

    it('Triggers if validation is enabled', () => {
        if (INTERNAL_VALIDATION_ENABLED) {
            expect(() => assertInternal(false)).toThrow();
        }
    });
});
