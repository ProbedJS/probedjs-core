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

import { onDispose } from '../Environment';
import { Notifier, notify, removeListener } from '../Notifier';

export interface ReaderBase<T> {
    addListener(lst: (v: T) => void): void;
    removeListener(lst: (v: T) => void): void;

    current: T;

    _probed_dyntype?: number;
}

export class DynamicBase<T> implements ReaderBase<T> {
    protected _value: T;
    protected _notifier?: Notifier<T>;

    constructor(initVal: T) {
        this._value = initVal;
    }

    get current(): T {
        return this._value;
    }

    set current(v: T) {
        this.set(v);
    }

    set(v: T): void {
        const notif = this._value !== v;
        this._value = v;
        if (notif && this._notifier) {
            notify(this._notifier, v);
        }
    }

    addListener(lst: (v: T) => void): void {
        if (!this._notifier) {
            this._notifier = [];
        }
        this._notifier.push(lst);

        onDispose(() => {
            removeListener(this._notifier!, lst);
            if (this._notifier!.length === 0) {
                delete this._notifier;
            }
        });
    }

    removeListener(lst: (v: T) => void): void {
        removeListener(this._notifier!, lst);
    }

    _probed_dyntype?: number; // Will be set in the prototype.
}
DynamicBase.prototype._probed_dyntype = 1;
