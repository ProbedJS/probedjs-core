import { DisposeOp, popEnv, pushEnv } from './Environment';
import {
    IPNode,
    AsPNode,
    Intrinsics,
    ProbedParams,
    ProbedResult,
    IntrinsicFallback,
    ProbingFunction,
    IKeys,
    FuncMap,
    ProbingContext,
} from './ApiTypes';
import { IProber, BaseNode, NodeImpl, UnwrapPNode, isPNode } from './Node';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentCb = (...args: any[]) => any;

const isIntrinsic = <I>(cb: IKeys<I> | ((...args: unknown[]) => unknown)): cb is IKeys<I> => {
    return typeof cb === 'string';
};

let _NextUniqueNodeId = 0;

interface NodeQueue {
    _head: BaseNode;
    _tail: BaseNode;
}

interface ProberStackFrame {
    _node?: BaseNode;
    _disposeOps: DisposeOp[];
    _announced?: NodeQueue;
}

class Prober<I extends FuncMap> implements IProber {
    private _intrinsics: Partial<I>;
    private _fallback?: IntrinsicFallback<I>;
    private _stack: ProberStackFrame[] = [];
    private _currentFrame: ProberStackFrame = { _disposeOps: [] };

    _onDispose(op: DisposeOp): void {
        this._currentFrame._disposeOps.push(op);
    }

    _getProbingContext(): ProbingContext {
        return this._currentFrame!._node!._buildData!._context;
    }

    constructor(intrinsics: Partial<I>, fallback?: IntrinsicFallback<I>) {
        this._intrinsics = intrinsics;
        this._fallback = fallback;
    }

    _announce<T extends IKeys<I> | ComponentCb>(what: T, ..._args: ProbedParams<T, I>): AsPNode<ProbedResult<T, I>> {
        const { _cb, _name } = this._getCb(what);
        if (process.env.NODE_ENV !== 'production') {
            if (isIntrinsic<I>(what)) {
                if (!this._intrinsics[what] && !this._fallback) {
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

        if (!this._currentFrame._announced) {
            this._currentFrame._announced = { _head: newNode, _tail: newNode };
        } else {
            this._currentFrame._announced._tail._buildData!._next = newNode;
            this._currentFrame._announced._tail = newNode;
        }

        newNode._buildData = {
            _resolveAs: newNode,
            _cb,
            _prober: this,
            _args,
            _context: {
                componentName: _name,
            },
        };

        return newNode as AsPNode<ProbedResult<T, I>>;
    }

    _finalizeNode(node: BaseNode) {
        // If a component returns a Node (as opposed to a value), then we short-circuit to the parent.
        const bd = node._buildData!;
        const destinationNode = bd._resolveAs;

        this._currentFrame._node = node;
        const cbResult = bd._cb(...bd._args, bd._context);

        if (isPNode(cbResult)) {
            if (cbResult.finalized) {
                // Post-ex-facto proxying.
                destinationNode._result = cbResult._result;
                if (cbResult._onDispose) {
                    destinationNode._addToDispose(cbResult._onDispose);
                    // No need to clear the list on cbResult, that node is getting dropped.
                }
            } else {
                cbResult._buildData!._resolveAs = destinationNode;
            }
        } else {
            destinationNode._result = cbResult;
        }

        if (this._currentFrame._disposeOps.length > 0) {
            destinationNode._addToDispose(this._currentFrame._disposeOps);
            this._currentFrame._disposeOps = [];
        }
    }

    _finalize(target: IPNode): void {
        if (process.env.NODE_ENV === 'check') {
            let lookup: BaseNode | undefined;
            if (this._currentFrame._announced) {
                lookup = this._currentFrame._announced._head;
            }
            while (lookup && lookup !== target) {
                lookup = lookup._buildData!._next;
            }
            if (lookup !== target) {
                throw Error("Can't find target from here.");
            }
        }

        let node = this._currentFrame._announced!._head!;
        let end = target as BaseNode;

        if (end._buildData!._next) {
            this._currentFrame._announced!._head = end._buildData!._next;
        } else {
            this._currentFrame._announced = undefined;
        }
        end._buildData!._next = undefined;

        pushEnv(this);
        this._stack.push(this._currentFrame);
        this._currentFrame = { _node: node, _disposeOps: [] };

        let done = false;
        while (!done) {
            this._finalizeNode(node);

            // Queue up any work that was discovered in the process,
            // and update our end target so that we complete it before
            // returning.
            if (this._currentFrame._announced) {
                end = this._currentFrame._announced._tail;
                node._buildData!._next = this._currentFrame._announced._head;
                this._currentFrame._announced = undefined;
            }

            done = node === end;
            const nextNode = node._buildData!._next;
            node._buildData = undefined;
            node = nextNode!;
        }

        this._currentFrame = this._stack.pop()!;
        popEnv();
    }

    private _getCb<T extends IKeys<I> | ComponentCb>(what: T): { _cb: ComponentCb; _name: string } {
        if (isIntrinsic<I>(what)) {
            let _cb: ComponentCb | undefined = this._intrinsics[what];
            if (!_cb) {
                _cb = this._fallback!;
            }

            return { _cb: _cb!, _name: what.toString() };
        } else {
            return { _cb: what as ComponentCb, _name: (what as ComponentCb).name };
        }
    }
}

export function createProber<I extends Intrinsics<I>>(intrinsics: I): ProbingFunction<I>;
export function createProber<I extends Intrinsics<I>>(
    intrinsics: Partial<I>,
    fallback: IntrinsicFallback<I>,
): ProbingFunction<I>;

export function createProber<I extends FuncMap>(
    intrinsics: I | Partial<I>,
    fallback?: IntrinsicFallback<I>,
): ProbingFunction<I> {
    const newProber = new Prober<I>(intrinsics, fallback);

    const probe = <T extends IKeys<I> | ComponentCb>(what: T, ...args: ProbedParams<T, I>) =>
        newProber._announce(what, ...args);

    return probe;
}

export const probe = createProber({});
