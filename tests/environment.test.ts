import { popEnv, pushEnv, useOnDispose, Environment } from '../src/Environment';
import { expectThrowInNotProd } from './utils';

const noop = () => {
    // do nothing.
};

const pingDispose = () => {
    useOnDispose(() => {
        noop;
    });
};

describe('useOnDispose ', () => {
    it('Fails if used out of context', () => {
        expect(pingDispose).toThrow();
    });
});

class TestEnv implements Environment {
    count = 0;
    _onDispose(): void {
        this.count += 1;
    }
}
describe('Environment', () => {
    it('Catches underflows', () => {
        expectThrowInNotProd(popEnv);
    });

    it('Registers', () => {
        const env = new TestEnv();
        pushEnv(env);
        pingDispose();

        expect(env.count).toBe(1);
        popEnv();

        expectThrowInNotProd(pingDispose);
        expectThrowInNotProd(popEnv);
    });

    it('Maintains the stack', () => {
        const envA = new TestEnv();
        const envB = new TestEnv();
        pushEnv(envA);
        pingDispose();
        pingDispose();

        pushEnv(envB);
        pingDispose();

        expect(envA.count).toBe(2);
        expect(envB.count).toBe(1);
        popEnv();

        pingDispose();
        pingDispose();
        expect(envA.count).toBe(4);
        expect(envB.count).toBe(1);

        popEnv();
        expectThrowInNotProd(pingDispose);
        expectThrowInNotProd(popEnv);
    });
});
