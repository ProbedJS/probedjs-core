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

import { ReaderBase } from './Base';
import { DynamicListReader } from './List';
import { DynamicValueReader } from './Value';

export type DynamicReader<T> = DynamicListReader<T> | DynamicValueReader<T>;

export type ValueReader<T> = T | DynamicValueReader<T>;
export type ListReader<T> = T | DynamicListReader<T>;

export type Reader<T> = T | DynamicReader<T>;

export const isDynamic = <T>(val: T | DynamicReader<T>): val is DynamicReader<T> => {
  return val !== null && typeof val === 'object' && !!(val as ReaderBase<T>)._probed_dyntype;
};
