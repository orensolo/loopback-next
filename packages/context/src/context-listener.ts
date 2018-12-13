// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Binding} from './binding';
import {ValueOrPromise} from './value-promise';

/**
 * Context event types
 */
export enum ContextEventType {
  bind = 'bind',
  unbind = 'unbind',
}

/**
 * A function that filters bindings. It returns `true` to select a given
 * binding.
 */
export type BindingFilter = (binding: Readonly<Binding<unknown>>) => boolean;

/**
 * Listeners of context bind/unbind events
 */
export interface ContextListener {
  /**
   * A filter function to match bindings
   */
  filter: BindingFilter;
  /**
   * Listen on `bind` or `unbind` and invalidate the cache
   */
  listen(
    event: ContextEventType,
    binding: Readonly<Binding<unknown>>,
  ): ValueOrPromise<void>;
}

/**
 * Subscription of context events. It's modeled after
 * https://github.com/tc39/proposal-observable.
 */
export interface Subscription {
  /**
   * unsubscribe
   */
  unsubscribe(): void;
  /**
   * Is the subscription closed?
   */
  closed: boolean;
}
