import { FuncMap, IKeys, IntrinsicFallback, IPNode } from './ApiTypes';
import { BaseNode } from './Node';
import { IProber, ComponentCb, isIntrinsic, IProberBase } from './internalInterfaces';

export const USER_VALIDATION_ENABLED = process.env.PROBED_USER_VALIDATION === 'ON';

// This file DOES contribute to coverage testing.
// In fact, this file would be a lot nicer if we had a little assert function,
// however, we want to ensure that we have actual coverage testing of these.
export const checkTargetNodeIsReachable = (prober: IProberBase, target: IPNode): void => {
    if (USER_VALIDATION_ENABLED) {
        const frame = prober._currentFrame;
        let lookup: BaseNode | undefined;
        if (frame._announced) {
            lookup = frame._announced._head;
        }
        while (lookup && lookup !== target) {
            lookup = lookup._buildData!._next;
        }

        if (lookup !== target) {
            throw new Error("PROBE_USAGE: Can't find target node in current context");
        }
    }
};

export const checkIsValidComponent = <I extends FuncMap>(
    prober: IProber<I>,
    component: IKeys<I> | ComponentCb,
): void => {
    if (USER_VALIDATION_ENABLED) {
        if (isIntrinsic<I>(component)) {
            if (component in prober._intrinsics) {
                if (typeof prober._intrinsics[component] !== 'function') {
                    throw new Error(`PROBE_USAGE: "${component}" is not a function`);
                }
            } else {
                if (!prober._fallback) {
                    throw new Error(
                        `PROBE_USAGE: "${component}" is not a registered intrinsic in this Prober, and there is no fallback function`,
                    );
                }
            }
        } else {
            if (typeof component !== 'function') {
                throw new Error(`PROBE_USAGE: "${component}" is not a function`);
            }
        }
    }
};

export const checkIsValidIntrinsics = <I extends FuncMap>(intrinsics: Partial<I>): void => {
    if (USER_VALIDATION_ENABLED) {
        if (typeof intrinsics !== 'object') {
            throw new Error('PROBE_USAGE: intrinsics table must be an object');
        }
    }
};

export const checkIsValidFallback = <I extends FuncMap>(fallback?: IntrinsicFallback<I>): void => {
    if (USER_VALIDATION_ENABLED) {
        if (fallback && typeof fallback !== 'function') {
            throw new Error('PROBE_USAGE: fallback must be a function');
        }
    }
};
