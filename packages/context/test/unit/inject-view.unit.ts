// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  Binding,
  BindingScope,
  bindingTagFilter,
  Context,
  ContextView,
  Getter,
  inject,
} from '../..';

describe('@inject.view', async () => {
  let ctx: Context;
  beforeEach(() => (ctx = givenContext()));

  class MyControllerWithGetter {
    @inject.view(bindingTagFilter('foo'), {watch: true})
    getter: Getter<string[]>;
  }

  class MyControllerWithValues {
    constructor(
      @inject.view(bindingTagFilter('foo'))
      public values: string[],
    ) {}
  }

  class MyControllerWithTracker {
    @inject.view(bindingTagFilter('foo'))
    view: ContextView<string[]>;
  }

  it('reports error if the target type (Getter<string[]>) is not ContextView', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithGetter);
    await expect(
      ctx.get<MyControllerWithGetter>('my-controller'),
    ).to.be.rejectedWith('The target type Function is not ContextView');
  });

  it('reports error if the target type (string[]) is not ContextView', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithValues);
    await expect(
      ctx.get<MyControllerWithValues>('my-controller'),
    ).to.be.rejectedWith('The target type Array is not ContextView');
  });

  it('injects as a view', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithTracker);
    const inst = await ctx.get<MyControllerWithTracker>('my-controller');
    expect(inst.view).to.be.instanceOf(ContextView);
    expect(await inst.view.values()).to.eql(['BAR', 'FOO']);
    // Add a new binding that matches the filter
    ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    // The view picks up the new binding
    expect(await inst.view.values()).to.eql(['BAR', 'XYZ', 'FOO']);
  });
});

describe('@inject with filter function', async () => {
  let ctx: Context;
  beforeEach(() => (ctx = givenContext()));

  class MyControllerWithGetter {
    @inject.getter(bindingTagFilter('foo'), {watch: true})
    getter: Getter<string[]>;
  }

  class MyControllerWithValues {
    constructor(
      @inject(bindingTagFilter('foo'))
      public values: string[],
    ) {}
  }

  class MyControllerWithView {
    @inject(bindingTagFilter('foo'))
    view: ContextView<string[]>;
  }

  it('injects as getter', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithGetter);
    const inst = await ctx.get<MyControllerWithGetter>('my-controller');
    const getter = inst.getter;
    expect(getter).to.be.a.Function();
    expect(await getter()).to.eql(['BAR', 'FOO']);
    // Add a new binding that matches the filter
    ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    // The getter picks up the new binding
    expect(await getter()).to.eql(['BAR', 'XYZ', 'FOO']);
  });

  it('injects as values', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithValues);
    const inst = await ctx.get<MyControllerWithValues>('my-controller');
    expect(inst.values).to.eql(['BAR', 'FOO']);
  });

  it('injects as a view', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithView);
    const inst = await ctx.get<MyControllerWithView>('my-controller');
    expect(inst.view).to.be.instanceOf(ContextView);
    expect(await inst.view.values()).to.eql(['BAR', 'FOO']);
    // Add a new binding that matches the filter
    ctx
      .bind('xyz')
      .to('XYZ')
      .tag('foo');
    // The view picks up the new binding
    expect(await inst.view.values()).to.eql(['BAR', 'XYZ', 'FOO']);
  });
});

function givenContext(bindings: Binding[] = []) {
  const parent = new Context('app');
  const ctx = new Context(parent, 'server');
  bindings.push(
    ctx
      .bind('bar')
      .toDynamicValue(() => Promise.resolve('BAR'))
      .tag('foo', 'bar')
      .inScope(BindingScope.SINGLETON),
  );
  bindings.push(
    parent
      .bind('foo')
      .to('FOO')
      .tag('foo', 'bar'),
  );
  return ctx;
}
