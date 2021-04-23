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

// ATTENTION: This file does not contribute to coverage testing!

export const INTERNAL_VALIDATION_ENABLED = process.env.PROBED_INTERNAL_VALIDATION === 'ON';

/** Validates the internal state of the library. If one of these fail, then there's a problem with
 * either the library itself, or the library's ability to handle invalid usages.
 */
export const assertInternal = (condition: boolean, msg?: string): void => {
    if (INTERNAL_VALIDATION_ENABLED && !condition) {
        throw new Error(msg || 'Internal consistency failure ');
    }
};

const markKey = (key: string): string => {
    return '_probed_mark_internal_' + key;
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const assertMarked = (what: Record<string, any>, key: string, msg?: string): void => {
    assertInternal(what[markKey(key)] as boolean, msg || 'expecting mark: ' + key);
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const assertUnmarked = (what: Record<string, any>, key: string, msg?: string): void => {
    assertInternal(!what[markKey(key)] as boolean, msg || 'unexpected mark: ' + key);
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mark = (what: Record<string, any>, key: string): void => {
    if (INTERNAL_VALIDATION_ENABLED) {
        const k = markKey(key);
        if (what[k]) {
            what[k]++;
        } else {
            what[k] = 1;
        }
    }
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unmark = (what: Record<string, any>, key: string): void => {
    if (INTERNAL_VALIDATION_ENABLED) {
        assertMarked(what, key);

        const k = markKey(key);
        what[k] -= 1;
        if (what[k] == 0) {
            delete what[k];
        }
    }
};
