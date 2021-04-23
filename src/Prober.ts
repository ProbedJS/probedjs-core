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
import { BaseNode, NodeImpl, UnwrapPNode, isPNode } from './Node';
import { mark, unmark, assertMarked } from './internalValidation';
import {
    checkIsValidComponent,
    checkIsValidFallback,
    checkIsValidIntrinsics,
    checkTargetNodeIsReachable,
} from './userValidation';
import { ComponentCb, IProber, isIntrinsic, ProberStackFrame } from './internalInterfaces';

export class Prober<I extends FuncMap> implements IProber<I> {
    _intrinsics: Partial<I>;
    _fallback?: IntrinsicFallback<I>;
    _stack: ProberStackFrame[] = [];
    _currentFrame: ProberStackFrame = { _disposeOps: [] };
    _nextNodeId?: number;

    _onDispose(op: DisposeOp): void {
        assertMarked(this, 'finalizing');

        this._currentFrame._disposeOps.push(op);
    }

    _getProbingContext(): ProbingContext {
        assertMarked(this, 'finalizing');

        return this._currentFrame!._node!._buildData!._context;
    }

    constructor(intrinsics: Partial<I>, fallback?: IntrinsicFallback<I>) {
        checkIsValidIntrinsics(intrinsics);
        checkIsValidFallback(fallback);

        this._intrinsics = intrinsics;
        this._fallback = fallback;
    }

    _announce<T extends IKeys<I> | ComponentCb>(
        component: T,
        ..._args: ProbedParams<T, I>
    ): AsPNode<ProbedResult<T, I>> {
        const { _cb, _name } = this._resolveComponent(component);

        const newNode = new NodeImpl<UnwrapPNode<T>>();

        if (!this._currentFrame._announced) {
            this._currentFrame._announced = { _head: newNode, _tail: newNode };
        } else {
            this._currentFrame._announced._tail._buildData!._next = newNode;
            this._currentFrame._announced._tail = newNode;
        }

        if (process.env.NODE_ENV !== 'production') {
            if (!this._nextNodeId) {
                this._nextNodeId = 0;
            }
            newNode._nodeId = this._nextNodeId++;
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

    _finalizeNode(node: BaseNode): void {
        const buildData = node._buildData!;
        const destinationNode = buildData._resolveAs;

        const frame = this._currentFrame;
        frame._node = node;
        const cbResult = buildData._cb(...buildData._args);

        if (isPNode(cbResult)) {
            if (cbResult.finalized) {
                destinationNode._assign(cbResult);
            } else {
                cbResult._buildData!._resolveAs = destinationNode;
            }
        } else {
            destinationNode._result = cbResult;
        }

        destinationNode._addToDispose(frame._disposeOps);
        frame._disposeOps = [];
    }

    _finalize(target: IPNode): void {
        mark(this, 'finalizing');
        checkTargetNodeIsReachable(this, target);

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

        unmark(this, 'finalizing');
    }

    private _resolveComponent(component: IKeys<I> | ComponentCb): { _cb: ComponentCb; _name: string } {
        checkIsValidComponent(this, component);

        if (isIntrinsic<I>(component)) {
            let _cb: ComponentCb | undefined = this._intrinsics[component];
            if (!_cb) {
                _cb = this._fallback!;
            }

            return { _cb: _cb!, _name: component.toString() };
        } else {
            return { _cb: component, _name: component.name };
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
