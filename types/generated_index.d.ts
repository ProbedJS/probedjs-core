declare type DisposeOp = () => void;

interface NodeBuildData {
    _cb: (...arg: any[]) => any;
    _args: any[];
    _next?: IPNode;
    _resolveAs?: IPNode;
    _prober: IProber;
}
declare type Component<ArgsT extends any[] = any[], RetT = any> = (...arg: ArgsT) => RetT;
/** Used to Contrain a type to ensure that all its keys map are components */
declare type IntrinsicMap<MapT> = {
    [P in keyof MapT]: Component;
};
declare type IntrinsicParams<Intrinsics extends IntrinsicMap<Intrinsics>, K extends keyof Intrinsics> = Parameters<Intrinsics[K]>;
declare type IntrinsicResult<Intrinsics extends IntrinsicMap<Intrinsics>, K extends keyof Intrinsics> = ReturnType<Intrinsics[K]>;
declare type Probed<MapT> = keyof MapT | Component;
declare type ProbedParams<Intrinsics extends IntrinsicMap<Intrinsics>, ProbedT extends Probed<Intrinsics>> = ProbedT extends keyof Intrinsics ? IntrinsicParams<Intrinsics, ProbedT> : ProbedT extends Component<infer T, any> ? T : never;
declare type ProbedResult<Intrinsics extends IntrinsicMap<Intrinsics>, ProbedT extends Probed<Intrinsics>> = ProbedT extends keyof Intrinsics ? IntrinsicResult<Intrinsics, ProbedT> : ProbedT extends Component<any[], infer T> ? T : never;
/** Creates a probing function. It accepts a mapping of strings to components. */
declare const createProber: <Intrinsics extends IntrinsicMap<Intrinsics>>(intrinsics: Intrinsics) => <T extends keyof Intrinsics | ((...args: any[]) => any)>(what: T, ...args: ProbedParams<Intrinsics, T>) => AsPNode<ProbedResult<Intrinsics, T>>;

interface IProber {
    _finalize(target: IPNode): void;
}
declare abstract class IPNode {
    finalize(): void;
    get finalized(): boolean;
    dispose(): void;
    _result?: unknown;
    _probed_pnodetype?: number;
    _onDispose?: DisposeOp[];
    _buildData?: NodeBuildData;
}
declare class PNode<T> extends IPNode {
    get result(): T;
    _result?: T;
    _probed_pnodetype?: number;
}
declare type AsPNode<T> = T extends PNode<infer U> ? PNode<U> : PNode<T>;

declare type Listener<T> = (current: T) => void;
declare type Notifier<T> = Listener<T>[];

interface ReaderBase<T> {
    addListener(lst: (v: T) => void): void;
    removeListener(lst: (v: T) => void): void;
    current: T;
    _probed_dyntype?: number;
}
declare class DynamicBase<T> implements ReaderBase<T> {
    protected _value: T;
    protected _notifier?: Notifier<T>;
    constructor(initVal: T);
    get current(): T;
    set current(v: T);
    set(v: T): void;
    addListener(lst: (v: T) => void): void;
    removeListener(lst: (v: T) => void): void;
    _probed_dyntype?: number;
}

declare const listen: <T>(v: ReaderBase<T>, cb: (v: T) => void) => void;

interface DynamicValueReader<T> extends ReaderBase<T> {
    /** Will be invoked whenever the value changes. */
    valueOf: () => T;
}
declare class DynamicValue<T> extends DynamicBase<T> implements DynamicValueReader<T> {
    valueOf(): T;
}

declare type ValueType<T> = T extends Array<infer U> ? U : never;
declare type MapCallback<T, U> = (v: ValueType<T>, index: number, array: T) => U;
interface DynamicListReader<T> extends DynamicValueReader<T> {
    /** Obtain the current value of the dynamic */
    map<U>(cb: MapCallback<T, U>): DynamicList<U[]>;
}
declare class DynamicList<T> extends DynamicBase<T> implements ReaderBase<T> {
    push(v: ValueType<T>): void;
    map<U>(cb: MapCallback<T, U>): DynamicList<U[]>;
}

declare type DynamicReader<T> = DynamicListReader<T> | DynamicValueReader<T>;
declare type ValueReader<T> = T | DynamicValueReader<T>;
declare type Reader<T> = T | DynamicReader<T>;
declare const isDynamic: <T>(val: T | DynamicReader<T>) => val is DynamicReader<T>;

declare function dependant<T, U>(v: DynamicReader<T>, cb: (v: T) => U): DynamicReader<U>;
declare function dependant<T, U>(v: T, cb: (v: T) => U): U;

/** Obtains the type of the underlying value type */
declare const valType: <T>(v: ValueReader<T>) => string;

declare function dynamic<T>(init: Array<T>): DynamicList<T[]>;
declare function dynamic<T>(init: T): DynamicValue<T>;

/** Register an operation to be executed when the component currently being probed
 * is removed from the tree.
 */
declare const useOnDispose: (op: DisposeOp) => void;

declare const probe: <T extends (...args: any[]) => any>(what: T, ...args: ProbedParams<{}, T>) => AsPNode<ProbedResult<{}, T>>;

export { IPNode, PNode, Reader, ProbedParams as __ProbedParams, ProbedResult as __ProbedResult, createProber, dependant, dynamic, isDynamic, listen, probe, useOnDispose, valType };
