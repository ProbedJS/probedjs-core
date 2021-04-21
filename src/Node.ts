/*
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

import { IPNode } from './ApiTypes';
import { DisposeOp } from './Environment';

export interface IProber {
    _finalize(target: IPNode): void;
}

export interface NodeBuildData {
    _cb: (...arg: any[]) => any;
    _args: any[];

    _next?: IPNode;
    _resolveAs?: IPNode;
    _prober: IProber;
}

export abstract class BaseNode implements IPNode {
    get finalized(): boolean {
        return !this._buildData;
    }

    finalize(): void {
        if (this._buildData) {
            this._buildData._prober._finalize(this);
        }
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
    _uniqueNodeId?: number;
}

export class NodeImpl<T> extends BaseNode {
    get result(): T {
        this.finalize();
        return this._result!;
    }

    _result?: T;
    _probed_pnodetype?: number;
}
NodeImpl.prototype._probed_pnodetype = 1;

export type UnwrapPNode<T> = T extends NodeImpl<infer U> ? U : T;

export const isPNode = (what: unknown): what is BaseNode => {
    return what !== null && typeof what === 'object' && !!(what as BaseNode)._probed_pnodetype;
};
