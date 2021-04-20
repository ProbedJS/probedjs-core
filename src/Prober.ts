/**
 * Copyright 2021 Francois Chabot
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Primitive mappings look like:
//
// interface HTMLMapping {
//    "div" : (p: DivProps) => HTMLDivElement
//    "span": (p: SpanProps) => HTMLSpanElement
//    ...
// }
//
// When dealing with multiple contexts within the same app, mapppings can be combined:
//
// type AppMappings = HTMLMapping & SVGMapping;

//import { DisposeOp } from './Context';
import { DisposeOp, pop as popContext, push as pushContext } from './Environment';
import { AsPNode, UnwrapPNode, PNode, IPNode, IProber, isPNode } from './Node';

export interface NodeBuildData {
  _cb: (...arg: any[]) => any;
  _args: any[];

  _next?: IPNode;
  _resolveAs?: IPNode;
  _prober: IProber;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Component<ArgsT extends any[] = any[], RetT = any> = (...arg: ArgsT) => RetT;

/** Used to Contrain a type to ensure that all its keys map are components */
type IntrinsicMap<MapT> = {
  [P in keyof MapT]: Component;
};

type IntrinsicParams<Intrinsics extends IntrinsicMap<Intrinsics>, K extends keyof Intrinsics> = Parameters<
  Intrinsics[K]
>;
type IntrinsicResult<Intrinsics extends IntrinsicMap<Intrinsics>, K extends keyof Intrinsics> = ReturnType<
  Intrinsics[K]
>;

type Probed<MapT> = keyof MapT | Component;

export type ProbedParams<
  Intrinsics extends IntrinsicMap<Intrinsics>,
  ProbedT extends Probed<Intrinsics>
> = ProbedT extends keyof Intrinsics
  ? IntrinsicParams<Intrinsics, ProbedT> // It's a valid primitive key
  : ProbedT extends Component<infer T, any>
  ? T // It's a valid callable that returns a U
  : never;

export type ProbedResult<
  Intrinsics extends IntrinsicMap<Intrinsics>,
  ProbedT extends Probed<Intrinsics>
> = ProbedT extends keyof Intrinsics
  ? IntrinsicResult<Intrinsics, ProbedT> // It's a valid primitive key
  : ProbedT extends Component<any[], infer T>
  ? T // It's a valid callable that returns a U
  : never;

const isIntrinsic = <Intrinsics>(what: Probed<Intrinsics>): what is keyof Intrinsics => {
  return typeof what === 'string';
};

class Prober<Intrinsics extends IntrinsicMap<Intrinsics>> implements IProber {
  private _intrinsics: Intrinsics;
  private _queueHead?: IPNode;
  private _insert?: IPNode;
  private _end?: IPNode;

  private _insertStack: (IPNode | undefined)[] = [];
  private _endStack: (IPNode | undefined)[] = [];

  private _pendingOnDispose: DisposeOp[] = [];
  onDispose(op: DisposeOp): void {
    this._pendingOnDispose.push(op);
  }

  constructor(intrinsics: Intrinsics) {
    this._intrinsics = intrinsics;
  }

  announce<T extends keyof Intrinsics | Component>(
    what: T,
    ..._args: ProbedParams<Intrinsics, T>
  ): AsPNode<ProbedResult<Intrinsics, T>> {
    if (process.env.NODE_ENV !== 'production') {
      if (isIntrinsic<Intrinsics>(what)) {
        if (!this._intrinsics[what]) {
          throw Error(`"${what}" is not a registered intrinsic in this Prober`);
        }
      } else {
        if (typeof what !== 'function') {
          throw Error(`"${what}" is not a function`);
        }
      }
    }

    const newNode = new PNode<UnwrapPNode<T>>();
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

    return newNode as AsPNode<ProbedResult<Intrinsics, T>>;
  }

  finalize(target: IPNode): void {
    // This can be called recursively,
    pushContext(this);
    this._endStack.push(this._end);

    // We need to loop until target and any node probed while compiling target have been finalized.
    // this._end will be updated accordingly inside of announce()
    this._end = target;

    let currentNode: IPNode;
    do {
      currentNode = this._queueHead!;

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
          destinationNode._result = cbResult._result;
        } else {
          cbResult._buildData!._resolveAs = destinationNode;
        }
      } else {
        destinationNode._result = cbResult;
      }

      if (this._pendingOnDispose.length > 0) {
        if (!destinationNode._onDispose) {
          destinationNode._onDispose = this._pendingOnDispose;
        } else {
          destinationNode._onDispose = destinationNode._onDispose.concat(this._pendingOnDispose);
        }

        this._pendingOnDispose = [];
      }

      this._queueHead = currentNode._buildData!._next;
      currentNode._buildData = undefined;
      this._insert = this._insertStack.pop();
    } while (currentNode !== this._end);

    this._end = this._endStack.pop();
    popContext();
  }

  private _getCb<T extends keyof Intrinsics | Component>(what: T): Component {
    if (isIntrinsic<Intrinsics>(what)) {
      return this._intrinsics[what];
    } else {
      return what as Component;
    }
  }
}

// An explicit interface for the return type of createProber leads to nicer help texts.
type ProberApi<Intrinsics extends IntrinsicMap<Intrinsics>> = <T extends keyof Intrinsics | ((...args: any[]) => any)>(
  what: T,
  ...args: ProbedParams<Intrinsics, T>
) => AsPNode<ProbedResult<Intrinsics, T>>;
/** Creates a prober endpoint.
 *
 * const {probe, rootProbe} = createProber(intrinsics);
 *
 * The intrinsics paramter should be an object of which every single key maps
 * to a function.
 */
export const createProber = <Intrinsics extends IntrinsicMap<Intrinsics>>(
  intrinsics: Intrinsics,
): ProberApi<Intrinsics> => {
  const result = new Prober(intrinsics);

  // The code I wish I could write here:
  // return {
  //     probe: result.rootProbe.bind(result),
  //     rootProbe: result.probe.bind(result)
  // };

  /** Probes a component, initiating a probing process if needed. If you need to access the resulting node's
   *  content, use rootProbe() instead.
   *
   * @param what The component to probe. Either an intrinsic's name, or a function.
   * @param args The arguments to pass to the component at creation time.
   * @returns An IPNode that will be processed by the time the current probing process completes.
   */
  const probe = <T extends keyof Intrinsics | Component>(what: T, ...args: ProbedParams<Intrinsics, T>) =>
    result.announce(what, ...args);

  return probe;
};
