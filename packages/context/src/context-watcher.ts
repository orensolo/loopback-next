// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import * as debugFactory from 'debug';
import {Binding} from './binding';
import {Context} from './context';
import {
  BindingFilter,
  ContextEventType,
  ContextListener,
  Subscription,
} from './context-listener';
import {Getter} from './inject';
import {ResolutionSession} from './resolution-session';
import {resolveList} from './value-promise';
const debug = debugFactory('loopback:context:watcher');

/**
 * Watching a given context chain to maintain a live list of matching bindings
 * and their resolved values within the context hierarchy.
 *
 * This class is the key utility to implement dynamic extensions for extension
 * points. For example, the RestServer can react to `controller` bindings even
 * they are added/removed/updated after the application starts.
 *
 */
export class ContextWatcher<T = unknown> implements ContextListener {
  protected _cachedBindings: Readonly<Binding<T>>[] | undefined;
  protected _cachedValues: T[] | undefined;
  private _subscription: Subscription | undefined;

  constructor(
    protected readonly ctx: Context,
    public readonly filter: BindingFilter,
  ) {}

  /**
   * Start watching events from the context
   */
  watch() {
    debug('Start watching context %s', this.ctx.name);
    return (this._subscription = this.ctx.subscribe(this));
  }

  /**
   * Stop watching events from the context
   */
  unwatch() {
    debug('Stop watching context %s', this.ctx.name);
    if (this._subscription && !this._subscription.closed) {
      this._subscription.unsubscribe();
      this._subscription = undefined;
    }
  }

  /**
   * Get the list of matched bindings. If they are not cached, it tries to find
   * them from the context.
   */
  get bindings(): Readonly<Binding<T>>[] {
    debug('Reading bindings');
    if (this._cachedBindings == null) {
      this._cachedBindings = this.findBindings();
    }
    return this._cachedBindings;
  }

  /**
   * Find matching bindings and refresh the cache
   */
  protected findBindings() {
    debug('Finding matching bindings');
    this._cachedBindings = this.ctx.find(this.filter);
    return this._cachedBindings;
  }

  /**
   * Listen on `bind` or `unbind` and invalidate the cache
   */
  listen(event: ContextEventType, binding: Readonly<Binding<unknown>>) {
    this.reset();
  }

  /**
   * Reset the watcher by invalidating its cache
   */
  reset() {
    debug('Invalidating cache');
    this._cachedBindings = undefined;
    this._cachedValues = undefined;
  }

  /**
   * Resolve values for the matching bindings
   * @param session Resolution session
   */
  resolve(session?: ResolutionSession) {
    debug('Resolving values');
    return resolveList(this.bindings, b => {
      return b.getValue(this.ctx, ResolutionSession.fork(session));
    });
  }

  /**
   * Get the list of resolved values. If they are not cached, it tries to find
   * and resolve them.
   */
  async values(): Promise<T[]> {
    debug('Reading values');
    // [REVIEW] We need to get values in the next tick so that it can pick up
    // binding changes as `Context` publishes such events in `process.nextTick`
    return new Promise<T[]>(resolve => {
      process.nextTick(async () => {
        if (this._cachedValues == null) {
          this._cachedValues = await this.resolve();
        }
        resolve(this._cachedValues);
      });
    });
  }

  /**
   * As a `Getter` function
   */
  asGetter(): Getter<T[]> {
    return () => this.values();
  }
}
