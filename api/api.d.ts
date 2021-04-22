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
export type ProbingFunction<I extends Intrinsics<I>> = <T extends keyof I | ((...args: any[]) => unknown)>(
    cb: T,
    ...args: ProbedParams<T, I>
) => AsPNode<ProbedResult<T, I>>;

export interface ProbingContext {
    componentName: string;
}

export type Component<Args extends unknown[], Ret> = (...args: AddOptionalContext<Args>) => Ret;

/**
 * Creates a probe() function that is bound against a set of intrinsic components.
 *
 * ex: const probe = createProber({"hi": x=>x+5, "bye": x=>x*2});
 *     probe("hi", 12);
 */
export declare function createProber<I extends Intrinsics<I>>(intrinsics: I): ProbingFunction<I>;

/** Default probe() function not bound to any intrinsic. */
// eslint-disable-next-line @typescript-eslint/ban-types
export declare function probe<T extends (...args: any[]) => unknown>(
    cb: T,
    ...args: Parameters<T>
): AsPNode<ReturnType<T>>;

// ***************** Hooks ***************** //

/** Registers a callback that will be invoked when component currently being probed is disposed. */
export declare function useOnDispose(op: () => void): void;

// ***************** Dynamics ***************** //

/** Determines at runtime if a value is static or dynamic. */
export declare function isDynamic<T>(val: T | DynamicReader<T>): val is DynamicReader<T>;

// ************ Dynamics - Readers ************ //

/** Consumer API for a dynamic value. */
export interface DynamicReaderBase<T> {
    addListener(lst: (v: T) => void): void;
    removeListener(lst: (v: T) => void): void;

    readonly current: T;
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

/** Creates a new Dynamic value. */
export declare function dynamic<T>(init: T[]): DynamicList<T[]>;
export declare function dynamic<T>(init: T): DynamicValue<T>;

// ************ Dynamics - Generic Operations ************ //
// These operations can be done either on dynamic values, or regular values.

/** Invokes a callback whenever the value changes, if it is dynamic */
export declare function listen<T>(v: Reader<T>, cb: (v: T) => void): void;

/** Creates a value, static or dynamic, that tracks the arguments. */
export declare function transform<T, U>(v: DynamicReaderBase<T>, cb: (v: T) => U): DynamicReader<U>;
export declare function transform<T, U>(v: T, cb: (v: T) => U): U;

/** Returns the result of JavaScript's typeof for the underlying value. */
export declare function valType<T>(v: Reader<T>): string;

// ***************** Utility / not user-facing ***************** //

type DynamicReader<T> = DynamicListReader<T extends Array<unknown> ? T : never> | DynamicValueReader<T>;

type AsPNode<T> = T extends PNode<infer U> ? PNode<U> : PNode<T>;

export type Intrinsics<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => unknown ? T[K] : never;
};

export type IKeys<T> = keyof Intrinsics<T>;

type AddOptionalContext<T extends unknown[]> = [...T, ProbingContext];
type RemoveContextArg<T> = T extends [...infer Rest, infer LastArg] ? (LastArg extends ProbingContext ? Rest : T) : T;

export type IntrinsicParams<K extends IKeys<I>, I extends Intrinsics<I>> = RemoveContextArg<
    Parameters<Intrinsics<I>[K]>
>;
export type IntrinsicResult<K extends IKeys<I>, I extends Intrinsics<I>> = ReturnType<Intrinsics<I>[K]>;

export type Probed<I extends Intrinsics<I> = Record<string, never>> = IKeys<I> | ((...args: any[]) => unknown);

export type ProbedParams<T extends Probed<I>, I extends Intrinsics<I> = Record<string, never>> = T extends keyof I
    ? IntrinsicParams<T, I>
    : T extends (...arg: infer P) => unknown
    ? RemoveContextArg<P>
    : never;

export type ProbedResult<T extends Probed<I>, I extends Intrinsics<I> = Record<string, never>> = T extends keyof I
    ? IntrinsicResult<T, I>
    : T extends (...arg: any[]) => infer P
    ? P
    : never;

export type ListValueType<ArrayType extends Array<unknown>> = ArrayType[number];
