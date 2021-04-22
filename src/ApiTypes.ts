/**
 * Copyright 2021 Francois Chabot
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ***************** Components ***************** //

/** A probed component. */
export interface IPNode {
    /** Wether the component's callback has been invoked to completion. */
    readonly finalized: boolean;

    /** Call all dispose handlers attached to this node and its children. */
    dispose(): void;

    /** Forces the node to be finalized. You generaly don't need to call this. */
    finalize(): void;

    /** The result of the node's callback, finalizing it if needed. */
    readonly result: unknown;
}

/** A probed component of which the return type is known. */
export interface PNode<T> extends IPNode {
    /** The result of the node's callback, finalizing it if needed. */
    readonly result: T;
}

/** A function that implements the probe() functionality for a given set of intrinsics. */
export type ProbingFunction<I extends Intrinsics<I>> = <T extends keyof I | ((...args: any[]) => any)>(
    cb: T,
    ...args: ProbedParams<T, I>
) => AsPNode<ProbedResult<T, I>>;

// ************ Dynamics - Readers ************ //

/** Consumer API for a dynamic value. */
export interface DynamicReaderBase<T> {
    addListener(lst: (v: T) => void): void;
    removeListener(lst: (v: T) => void): void;

    readonly current: T;

    /** gets string representation */
    toString(): string;
}

/** Consumer API for a dynamic primitive. */
export interface DynamicValueReader<T> extends DynamicReaderBase<T> {
    valueOf: () => T;
}

/** Consumer API for a dynamic Array. */
export interface DynamicListReader<T extends Array<unknown>> extends DynamicReaderBase<T> {
    map<U>(cb: (v: ListValueType<T>, index: number, array: T) => U): DynamicList<U[]>;
}

/** Universal "This might be dynamic or not". */
export type Reader<T> = T | DynamicReader<T>;

// ************ Dynamics - Writers ************ //

export interface DynamicBase<T> extends DynamicReaderBase<T> {
    /** Assigning this will notify all listeners. */
    current: T;

    /** Manually trigger all listeners. */
    notify(): void;
}

export interface DynamicValue<T> extends DynamicBase<T> {
    valueOf: () => T;
}

export interface DynamicList<T extends Array<unknown>> extends DynamicBase<T> {
    map<U>(cb: (v: ListValueType<T>, index: number, array: T) => U): DynamicList<U[]>;

    push(v: ListValueType<T>): void;
}

// ***************** Utility / not user-facing ***************** //

export type DynamicReader<T> = DynamicListReader<T extends Array<unknown> ? T : never> | DynamicValueReader<T>;

export type AsPNode<T> = T extends PNode<infer U> ? PNode<U> : PNode<T>;

export type Component<ArgsT extends any[] = any[], RetT = any> = (...arg: ArgsT) => RetT;

export type Intrinsics<I> = {
    [_ in keyof I]: Component;
};

export type IntrinsicParams<K extends keyof I, I extends Intrinsics<I>> = Parameters<I[K]>;
export type IntrinsicResult<K extends keyof I, I extends Intrinsics<I>> = ReturnType<I[K]>;

export type Probed<I extends Intrinsics<I> = Record<string, never>> = keyof I | Component;

export type ProbedParams<T extends Probed<I>, I extends Intrinsics<I> = Record<string, never>> = T extends keyof I
    ? IntrinsicParams<T, I>
    : T extends Component<infer P, any>
    ? P
    : never;

export type ProbedResult<T extends Probed<I>, I extends Intrinsics<I> = Record<string, never>> = T extends keyof I
    ? IntrinsicResult<T, I>
    : T extends Component<any[], infer P>
    ? P
    : never;

export type ListValueType<ArrayType extends Array<unknown>> = ArrayType[number];
