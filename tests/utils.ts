import { USER_VALIDATION_ENABLED } from '../src/userValidation';

export const invalidUserAction = (cb: () => void): void => {
    if (USER_VALIDATION_ENABLED) {
        expect(cb).toThrow('PROBE_USAGE: ');
    }
};
