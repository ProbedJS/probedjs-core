export const expectThrowInNotProd = (cb: () => void) => {
    if (process.env.NODE_ENV === 'production') {
        //expect(cb).not.toThrow();
    } else {
        expect(cb).toThrow();
    }
};

export const expectThrowInCheck = (cb: () => void) => {
    if (process.env.NODE_ENV === 'check') {
        expect(cb).toThrow();
    } else {
        //expect(cb).not.toThrow();
    }
};
