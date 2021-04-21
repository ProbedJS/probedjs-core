export const expectThrowInNotProd = (cb: () => void) => {
    if (process.env.NODE_ENV === 'production') {
        //expect(cb).not.toThrow();
    } else {
        expect(cb).toThrow();
    }
};
