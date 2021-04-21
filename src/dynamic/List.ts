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

import { DynamicBaseImpl } from './Base';
import { ListValueType, DynamicList } from '../ApiTypes';

export class DynamicListImpl<T extends Array<unknown>> extends DynamicBaseImpl<T> implements DynamicList<T> {
    push(v: ListValueType<T>): void {
        this._value.push(v);
        this.notify();
    }

    map<U>(cb: (value: ListValueType<T>, index: number, array: T) => U): DynamicList<U[]> {
        const regenerate = (newArray: T): U[] => {
            // For loop instead of map, because this is confusing TypeScript.
            const result: U[] = [];
            const len = newArray.length;
            for (let i = 0; i < len; ++i) {
                result.push(cb(newArray[i], i, newArray));
            }
            return result;
        };

        const result = new DynamicListImpl<U[]>(regenerate(this.current));

        this.addListener((v) => {
            result._value = regenerate(v);
        });
        return result;
    }
}
