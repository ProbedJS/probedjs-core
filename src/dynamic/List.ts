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

import { notify } from '../Notifier';
import { DynamicBase, ReaderBase } from './Base';
import { DynamicValue, DynamicValueReader } from './Value';

type ValueType<T> = T extends Array<infer U> ? U : never;

type MapCallback<T, U> = (v: ValueType<T>, index: number, array: T) => U;

interface MapCacheEntry<U> {
    value: U;
    index: number;
    indexProp?: DynamicValue<number>;
}

export interface DynamicListReader<T> extends DynamicValueReader<T> {
    /** Obtain the current value of the dynamic */
    map<U>(cb: MapCallback<T, U>): DynamicList<U[]>;
}

export class DynamicList<T> extends DynamicBase<T> implements ReaderBase<T> {
    push(v: ValueType<T>): void {
        // TODO: push(...items: T[]): number;
        ((this._value as unknown) as ValueType<T>[]).push(v);
        if (this._notifier) {
            notify(this._notifier, this._value);
        }
    }

    map<U>(cb: MapCallback<T, U>): DynamicList<U[]> {
        let cache = new Map<ValueType<T>, MapCacheEntry<U>>();
        const indexSensitive = cb.length >= 2;

        const regenerate = (v: ValueType<T>[]): U[] => {
            const newCache = new Map<ValueType<T>, MapCacheEntry<U>>();

            const result = v.map((v, i, a) => {
                const cacheEntry = cache.get(v);
                if (cacheEntry) {
                    if (indexSensitive && i !== cacheEntry.index) {
                        cacheEntry.indexProp!.set(i);
                    }
                    newCache.set(v, cacheEntry);
                    return cacheEntry.value;
                }

                const value = cb(v, i, (a as unknown) as T);
                let indexProp: DynamicValue<number> | undefined = undefined;
                if (indexSensitive) {
                    indexProp = new DynamicValue<number>(i);
                }
                newCache.set(v, { value, index: i, indexProp });

                return value;
            });

            cache = newCache;
            return result;
        };

        const result = new DynamicList<U[]>(regenerate((this.current as unknown) as ValueType<T>[]));

        this.addListener((v) => {
            result._value = regenerate((v as unknown) as ValueType<T>[]);
        });
        return result;
    }
}
