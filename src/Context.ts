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

export type DisposeOp = () => void;
export interface Context {
  onDispose: (op: DisposeOp) => void;
}

let _currentContext: Context | null = null;
const _contextStack: (Context | null)[] = [];

export const push = (ctx: Context): void => {
  _contextStack.push(_currentContext);
  _currentContext = ctx;
};

export const pop = (): void => {
  if (process.env.NODE_ENV !== 'production' && _contextStack.length === 0) {
    throw new Error('Context underflow');
  }
  _currentContext = _contextStack.pop()!;
};

export const onDispose = (op: DisposeOp): void => {
  if (process.env.NODE_ENV !== 'production' && !_currentContext) {
    throw new Error('Context underflow');
  }

  _currentContext!.onDispose(op);
};
