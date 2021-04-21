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

import { DynamicList, DynamicReaderBase, DynamicValue, Reader, DynamicReader } from '../ApiTypes';
import { DynamicBaseImpl } from './Base';
import { DynamicListImpl } from './List';
import { DynamicValueImpl } from './Value';

export function listen<T>(v: T | DynamicReaderBase<T>, cb: (v: T) => void): void {
    if (isDynamic(v)) {
        cb(v.current);
        v.addListener(cb);
    } else {
        return cb(v);
    }
}

export function transform<T, U>(v: DynamicReaderBase<T>, cb: (v: T) => U): DynamicReader<U>;
export function transform<T, U>(v: T, cb: (v: T) => U): U;
export function transform<T, U>(v: T | DynamicReaderBase<T>, cb: (v: T) => U): Reader<U> {
    if (isDynamic(v)) {
        const result = dynamic(cb(v.current));

        v.addListener((newVal) => (result.current = cb(newVal)));

        return result;
    } else {
        return cb(v);
    }
}

export function valType<T>(v: Reader<T>): string {
    if (isDynamic(v)) {
        return typeof v.current;
    } else {
        return typeof v;
    }
}

export function dynamic<T>(init: T[]): DynamicList<T[]>;
export function dynamic<T>(init: T): DynamicValue<T>;

export function dynamic<T>(init: T): DynamicValue<T> | DynamicList<T & unknown[]> {
    if (Array.isArray(init)) {
        return new DynamicListImpl<T & unknown[]>(init);
    }
    return new DynamicValueImpl(init);
}

export function isDynamic<T>(val: T | DynamicReader<T>): val is DynamicReader<T> {
    return val !== null && typeof val === 'object' && !!((val as unknown) as DynamicBaseImpl<T>)._probed_dyntype;
}
