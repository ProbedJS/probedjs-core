import { FuncMap, IKeys, IntrinsicFallback, IPNode } from './ApiTypes';
import { DisposeOp } from './Environment';
import { BaseNode } from './Node';

interface NodeQueue {
    _head: BaseNode;
    _tail: BaseNode;
}

export interface ProberStackFrame {
    _node?: BaseNode;
    _disposeOps: DisposeOp[];
    _announced?: NodeQueue;
}

export interface IProberBase {
    _finalize(target: IPNode): void;
    _currentFrame: ProberStackFrame;
}

export interface IProber<I extends FuncMap> {
    _intrinsics: Partial<I>;
    _fallback?: IntrinsicFallback<I>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentCb = (...args: any[]) => any;

export const isIntrinsic = <I>(cb: IKeys<I> | ((...args: unknown[]) => unknown)): cb is IKeys<I> => {
    return typeof cb === 'string';
};
