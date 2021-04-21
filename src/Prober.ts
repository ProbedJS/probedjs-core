import { DisposeOp, popEnv, pushEnv } from './Environment';
import { IPNode, AsPNode, Component, Intrinsics, ProbedParams, ProbedResult, ProbingFunction } from './ApiTypes';
import { IProber, BaseNode, NodeImpl, UnwrapPNode, isPNode } from './Node';

const isIntrinsic = <I>(cb: keyof I | ((...args: any[]) => any)): cb is keyof I => {
    return typeof cb === 'string';
};

const addToDisposeQueue = (node: BaseNode, ops: DisposeOp[]) => {
    if (!node._onDispose) {
        node._onDispose = ops;
    } else {
        node._onDispose = node._onDispose.concat(ops);
    }
};

let _NextUniqueNodeId = 0;

class Prober<I extends Intrinsics<I>> implements IProber {
    private _intrinsics: I;
    private _queueHead?: BaseNode;
    private _insert?: BaseNode;
    private _insertStack: (BaseNode | undefined)[] = [];

    private _end?: BaseNode;
    private _pendingOnDispose: DisposeOp[] = [];
    private _finalizeStack: {
        _end: BaseNode | undefined;
        _pendingOnDispose: DisposeOp[];
    }[] = [];

    _onDispose(op: DisposeOp): void {
        this._pendingOnDispose.push(op);
    }

    constructor(intrinsics: I) {
        this._intrinsics = intrinsics;
    }

    _announce<T extends keyof I | Component>(what: T, ..._args: ProbedParams<T, I>): AsPNode<ProbedResult<T, I>> {
        if (process.env.NODE_ENV !== 'production') {
            if (isIntrinsic<I>(what)) {
                if (!this._intrinsics[what]) {
                    throw Error(`"${what}" is not a registered intrinsic in this Prober`);
                }
            } else {
                if (typeof what !== 'function') {
                    throw Error(`"${what}" is not a function`);
                }
            }
        }

        const newNode = new NodeImpl<UnwrapPNode<T>>();
        if (process.env.NODE_ENV !== 'production') {
            newNode._uniqueNodeId = _NextUniqueNodeId++;
        }

        const _cb = this._getCb(what);
        let _next: IPNode | undefined;

        if (this._queueHead) {
            _next = this._insert!._buildData!._next;
            if (this._insert === this._end) {
                this._end = newNode;
            }
            this._insert!._buildData!._next = newNode;
            this._insert = newNode;
        } else {
            this._queueHead = newNode;
            this._insert = newNode;
            this._end = newNode;
        }

        newNode._buildData = { _cb, _prober: this, _args, _next };

        return newNode as AsPNode<ProbedResult<T, I>>;
    }

    _finalize(target: IPNode): void {
        // This can be called recursively,
        pushEnv(this);
        this._finalizeStack.push({ _end: this._end, _pendingOnDispose: this._pendingOnDispose });
        this._pendingOnDispose = [];
        this._end = target;

        let currentNode: BaseNode;
        do {
            currentNode = this._queueHead!;
            this._queueHead = currentNode._buildData!._next;

            // If a component returns a Node (as opposed to a value), then we short-circuit to the parent.
            let destinationNode = currentNode;
            while (destinationNode._buildData && destinationNode._buildData._resolveAs) {
                destinationNode = destinationNode._buildData!._resolveAs;
            }

            //
            this._insertStack.push(this._insert);

            const { _cb, _args } = currentNode._buildData!;
            const cbResult = _cb(..._args);

            if (isPNode(cbResult)) {
                if (cbResult.finalized) {
                    // Post-ex-facto proxying.
                    destinationNode._result = cbResult._result;
                    if (cbResult._onDispose) {
                        addToDisposeQueue(destinationNode, cbResult._onDispose);
                        cbResult._onDispose = [];
                    }
                } else {
                    cbResult._buildData!._resolveAs = destinationNode;
                }
            } else {
                destinationNode._result = cbResult;
            }

            if (this._pendingOnDispose.length > 0) {
                addToDisposeQueue(destinationNode, this._pendingOnDispose);
                this._pendingOnDispose = [];
            }

            currentNode._buildData = undefined;
            this._insert = this._insertStack.pop();
        } while (currentNode !== this._end && this._queueHead);

        const finalizePop = this._finalizeStack.pop()!;
        this._end = finalizePop._end;
        this._pendingOnDispose = finalizePop._pendingOnDispose;
        popEnv();
    }

    private _getCb<T extends keyof I | Component>(what: T): Component {
        if (isIntrinsic<I>(what)) {
            return this._intrinsics[what];
        } else {
            return what as Component;
        }
    }
}

export function createProber<I extends Intrinsics<I>>(intrinsics: I): ProbingFunction<I> {
    const newProber = new Prober(intrinsics);

    const probe = <T extends keyof Intrinsics<I> | Component>(what: T, ...args: ProbedParams<T, I>) =>
        newProber._announce(what, ...args);

    return probe;
}

export const probe = createProber({});
