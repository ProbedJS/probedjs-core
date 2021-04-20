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

import { DisposeOp } from './Environment';
import { NodeBuildData } from './Prober';

export interface IProber {
  finalize(target: IPNode): void;
}

export abstract class IPNode {
  finalize(): void {
    if (!this._result) {
      this._buildData?._prober.finalize(this);
    }
  }

  get finalized(): boolean {
    return !this._buildData;
  }

  dispose(): void {
    if (this._onDispose) {
      this._onDispose.forEach((c) => c());
      this._onDispose = undefined;
    }
  }

  _result?: unknown;
  _probed_pnodetype?: number;
  _onDispose?: DisposeOp[];

  _buildData?: NodeBuildData;
}

export class PNode<T> extends IPNode {
  get result(): T {
    this.finalize();
    return this._result!;
  }

  _result?: T;
  _probed_pnodetype?: number;
}
PNode.prototype._probed_pnodetype = 1;

export const onDispose = (node: IPNode, lst: DisposeOp): void => {
  if (!node._onDispose) {
    node._onDispose = [];
  }

  node._onDispose!.push(lst);
};

export type AsPNode<T> = T extends PNode<infer U> ? PNode<U> : PNode<T>;
export type UnwrapPNode<T> = T extends PNode<infer U> ? U : T;

export const isPNode = (what: unknown): what is IPNode => {
  return what !== null && typeof what === 'object' && !!(what as IPNode)._probed_pnodetype;
};
