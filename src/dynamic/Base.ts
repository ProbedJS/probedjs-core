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

import { DynamicBase } from '../ApiTypes';
import { useOnDispose } from '../Environment';

type Listener<T> = (v: T) => void;
type Notifier<T> = Listener<T>[];

export const notify = <T>(notifier: Notifier<T>, v: T): void => {
    let len = notifier.length;
    while (len--) {
        notifier[len](v);
    }
};

export const removeListener = <T>(notifier: Notifier<T>, lst: Listener<T>): void => {
    notifier.splice(notifier.indexOf(lst), 1);
};

export class DynamicBaseImpl<T> implements DynamicBase<T> {
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
        if (notif) {
            this.notify();
        }
    }

    toString(): string {
        return `${this._value}`;
    }

    addListener(lst: (v: T) => void): void {
        if (!this._notifier) {
            this._notifier = [];
        }
        this._notifier.push(lst);

        useOnDispose(() => {
            removeListener(this._notifier!, lst);
            if (this._notifier!.length === 0) {
                this._notifier = undefined;
            }
        });
    }

    removeListener(lst: (v: T) => void): void {
        removeListener(this._notifier!, lst);
    }

    notify(): void {
        if (this._notifier) {
            notify(this._notifier, this._value);
        }
    }

    _probed_dyntype?: number; // Will be set in the prototype.
}
DynamicBaseImpl.prototype._probed_dyntype = 1;
