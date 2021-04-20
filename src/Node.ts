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

import { DisposeOp } from './Context';

export interface IProber {
  finalize<T>(target: PNode<T>): T;
}

export class IPNode {
  _probed_pnodetype?: number;
  _onDispose?: DisposeOp[];
  result?: unknown;

  _buildInfo?: {
    _cb: (...arg: any[]) => any;
    _args: any[];

    _next?: IPNode;
    _resolveAs?: IPNode;
    _prober: IProber;
  };
}

IPNode.prototype._probed_pnodetype = 1;

export interface PNode<PayloadT> extends IPNode {
  result: PayloadT;
}

export const dispose = (node: IPNode): void => {
  if (node._onDispose) {
    node._onDispose.forEach((c) => c());
    delete node._onDispose;
  }
};

export const onDispose = (node: IPNode, lst: DisposeOp): void => {
  if (!node._onDispose) {
    node._onDispose = [];
  }

  node._onDispose!.push(lst);
};

export type AsPNode<T> = T extends PNode<infer U> ? PNode<U> : PNode<T>;
export type Unwrap<T> = T extends PNode<infer U> ? U : T;

export const isPNode = (what: unknown): what is IPNode => {
  return what !== null && typeof what === 'object' && !!(what as IPNode)._probed_pnodetype;
};

export const finalize = <T>(node: PNode<T>): T => {
  if (node.result) {
    return node.result;
  }
  return node._buildInfo!._prober.finalize(node);
};
