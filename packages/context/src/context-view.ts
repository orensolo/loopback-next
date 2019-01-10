// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import * as debugFactory from 'debug';
import {promisify} from 'util';
import {Binding} from './binding';
import {BindingFilter} from './binding-filter';
import {Context} from './context';
import {
  ContextEventListener,
  ContextEventType,
  Subscription,
} from './context-listener';
import {Getter} from './inject';
import {ResolutionSession} from './resolution-session';
import {resolveList} from './value-promise';
const debug = debugFactory('loopback:context:view');

/**
 * `ContextView` provides a view for a given context chain to maintain a live
 * list of matching bindings and their resolved values within the context
 * hierarchy.
 *
 * This class is the key utility to implement dynamic extensions for extension
 * points. For example, the RestServer can react to `controller` bindings even
 * they are added/removed/updated after the application starts.
 *
 */
export class ContextView<T = unknown> implements ContextEventListener {
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
   * Reset the view by invalidating its cache
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
    // We don't cache values with this method
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
    // Wait for the next tick so that context event notification can be emitted
    await promisify(process.nextTick)();
    if (this._cachedValues == null) {
      this._cachedValues = await this.resolve();
    }
    return this._cachedValues;
  }

  /**
   * As a `Getter` function
   */
  asGetter(): Getter<T[]> {
    return () => this.values();
  }
}
