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
import { DynamicBase, ReaderBase } from './Base';

export interface DynamicValueReader<T> extends ReaderBase<T> {
    /** Will be invoked whenever the value changes. */
    valueOf: () => T;
}

export class DynamicValue<T> extends DynamicBase<T> implements DynamicValueReader<T> {
    valueOf(): T {
        return this._value;
    }
}
