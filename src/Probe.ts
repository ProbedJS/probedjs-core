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

import { DisposeOp, pop as popContext, push as pushContext } from './Context';
import { AsPNode, isPNode, IPNode } from './Node';

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
  return typeof what !== 'function';
};

interface WorkingNode<Intrinsics extends IntrinsicMap<Intrinsics>> extends IPNode {
  _work_resolve?: () => IPNode;
}

/** A probing task that the Prober has to perform.
 *
 * WARNING: This is a loosely typed structure. It is expected that whatever produces those
 * ensures that everything lines up correctly. Currently, _queueWork() is the only
 * such place.
 */
interface WorkUnit<Intrinsics extends IntrinsicMap<Intrinsics>> {
  _what: keyof Intrinsics | Component;
  _args: ProbedParams<Intrinsics, Probed<Intrinsics>>;
  _where: WorkingNode<Intrinsics>;
  _next?: WorkUnit<Intrinsics>;
}

interface WorkQueue<Intrinsics extends IntrinsicMap<Intrinsics>> {
  _head?: WorkUnit<Intrinsics>;
  _tail?: WorkUnit<Intrinsics>;
}

class Prober<Intrinsics extends IntrinsicMap<Intrinsics>> {
  private _intrinsics: Intrinsics;
  private _probing = false;
  private _work: WorkQueue<Intrinsics> = {};

  private _workStack: WorkQueue<Intrinsics>[] = [];
  private _pendingOnDispose: DisposeOp[] = [];

  constructor(intrinsics: Intrinsics) {
    this._intrinsics = intrinsics;
  }

  rootProbe<T extends keyof Intrinsics | Component>(what: T, ...args: ProbedParams<Intrinsics, T>) {
    this._probing = true;
    this._workStack.push(this._work);

    pushContext(this);
    const rootWork = this._queueWork(what, args);

    try {
      while (this._work._head) {
        const todo = this._work._head;
        this._work._head = todo._next;
        // We are in loosely-typed land from this point on, and
        // relying on the work queue only containing "valid" stuff.
        this._performWork(todo._what, todo._args, todo._where);
      }
    } finally {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      this._work = this._workStack.pop()!;
      this._probing = this._workStack.length !== 0;
      popContext();
    }

    return rootWork._where as AsPNode<ProbedResult<Intrinsics, T>>;
  }

  probe<T extends keyof Intrinsics | Component>(what: T, ...args: ProbedParams<Intrinsics, T>) {
    // N.B. regarding why probe()'s return type is IPNode, there is nothing stopping us from returning
    // the exact node type: `AsPNode<CbResult<MapT, CbT>>`. However, due to the flattening algorithm and
    // how we can return placeholder nodes, we really don't want users messing around with non-root nodes.

    if (this._probing) {
      // If probing is currently underway, immediately return a placeholder node, and queue up the
      // work. This allows for very deep nesting by eliminating recursion.
      const work = this._queueWork(what, args);
      return work._where as AsPNode<ProbedResult<Intrinsics, T>>;
    }

    return this.rootProbe(what, ...args);
  }

  onDispose(op: DisposeOp): void {
    this._pendingOnDispose.push(op);
  }

  /**  Queing the work unfortunately throws away a bunch of type information.
   *    Thankfully, all of the user-facing functions are isolated from this.
   *    It does mean that the internals of the probing algorithm are not entirely type
   *    checked, however, so thread carefully when messing around in here.
   */
  private _queueWork<T extends Probed<Intrinsics>>(_what: T, _args: ProbedParams<Intrinsics, T>) {
    if (process.env.NODE_ENV !== 'production') {
      if (!this._probing) {
        throw new Error(`Queuing work while not probing.`);
      }
    }

    const placeholder = new IPNode();
    const work: WorkUnit<Intrinsics> = { _what, _args, _where: placeholder };
    work._where._work_resolve = () => placeholder;

    if (this._work._head) {
      this._work._tail!._next = work;
    } else {
      this._work._head = work;
    }
    this._work._tail = work;
    return work;
  }

  /**  */
  private _performWork<T extends Probed<Intrinsics>>(
    what: T,
    args: ProbedParams<Intrinsics, T>,
    where: WorkingNode<Intrinsics>,
  ) {
    const cbResult = this._execute(what, args);

    const resolved = where._work_resolve!();

    if (isPNode(cbResult)) {
      if (cbResult.data) {
        // This is a real, finalized node.

        resolved.data = cbResult.data;
        if (cbResult._onDispose) {
          if (!resolved._onDispose) {
            resolved._onDispose = cbResult._onDispose;
          } else {
            resolved._onDispose = resolved._onDispose.concat(cbResult._onDispose);
            // Alternative: (probably not worth it unless massive dispose counts are involved)
            // where._onDispose.push(()=>{cbResult._onDispose?.forEach(c=>c())})
          }
        }
      } else {
        // It's a placeholder node, make it resolve to our destination
        cbResult._work_resolve = where._work_resolve;
      }
    } else {
      resolved.data = cbResult;
    }

    if (this._pendingOnDispose.length > 0) {
      if (!resolved._onDispose) {
        resolved._onDispose = this._pendingOnDispose;
      } else {
        resolved._onDispose = resolved._onDispose.concat(this._pendingOnDispose);
      }

      this._pendingOnDispose = [];
    }
  }

  /** Performs the invocation of a given component. */
  private _execute<T extends Probed<Intrinsics>>(
    what: T,
    args: ProbedParams<Intrinsics, T>,
  ): ProbedResult<Intrinsics, T> {
    if (isIntrinsic<Intrinsics>(what)) {
      if (process.env.NODE_ENV !== 'production') {
        if (!this._intrinsics[what]) {
          throw Error(`"${what}" is not a registered intrinsic in this Prober`);
        }
      }
      return this._intrinsics[what](...args) as ProbedResult<Intrinsics, T>;
    } else {
      type FnType = (...v: ProbedParams<Intrinsics, T>) => ProbedResult<Intrinsics, T>;
      return (what as FnType)(...args);
    }
  }
}

// An explicit interface for the return type of createProber leads to nicer help texts.
interface ProberApi<Intrinsics extends IntrinsicMap<Intrinsics>> {
  probe: <T extends keyof Intrinsics | ((...args: any[]) => any)>(
    what: T,
    ...args: ProbedParams<Intrinsics, T>
  ) => AsPNode<ProbedResult<Intrinsics, T>>;
  rootProbe: <T extends keyof Intrinsics | ((...args: any[]) => any)>(
    what: T,
    ...args: ProbedParams<Intrinsics, T>
  ) => AsPNode<ProbedResult<Intrinsics, T>>;
}

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
    result.probe(what, ...args);

  /** Initiates and completes a probing process.
   *
   * @param what The component to probe. Either an intrinsic's name, or a function.
   * @param args The arguments to pass to the component.
   * @returns The generated node.
   */
  const rootProbe = <T extends keyof Intrinsics | ((...args: any[]) => any)>(
    what: T,
    ...args: ProbedParams<Intrinsics, T>
  ) => result.rootProbe(what, ...args);

  return { probe, rootProbe };
};
