export const invalidUserAction = (cb: () => void): void => {
    if (process.env.PROBED_USER_VALIDATION === 'ON') {
        expect(cb).toThrow('PROBE_USAGE: ');
    }
};
