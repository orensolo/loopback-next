import {expect} from '@loopback/testlab';
import {
  Context,
  ContextView,
  ContextEventListener,
  Getter,
  inject,
  ContextEventType,
  Binding,
} from '../..';

describe('ContextView - watches matching bindings', () => {
  let server: Context;
  let contextWatcher: ContextView;
  beforeEach(givenControllerWatcher);

  it('watches matching bindings', async () => {
    // We have ctx: 1, parent: 2
    expect(await getControllers()).to.eql(['1', '2']);
    server.unbind('controllers.1');
    // Now we have parent: 2
    expect(await getControllers()).to.eql(['2']);
    server.parent!.unbind('controllers.2');
    // All controllers are gone from the context chain
    expect(await getControllers()).to.eql([]);
    // Add a new controller - ctx: 3
    givenController(server, '3');
    expect(await getControllers()).to.eql(['3']);
  });

  function givenControllerWatcher() {
    server = givenServerWithinAnApp();
    contextWatcher = server.watch(Context.bindingTagFilter('controller'));
    givenController(server, '1');
    givenController(server.parent!, '2');
  }

  function givenController(_ctx: Context, _name: string) {
    class MyController {
      name = _name;
    }
    _ctx
      .bind(`controllers.${_name}`)
      .toClass(MyController)
      .tag('controller');
  }

  async function getControllers() {
    // tslint:disable-next-line:no-any
    return (await contextWatcher.values()).map((v: any) => v.name);
  }
});

describe('@inject.filter - injects a live collection of matching bindings', async () => {
  let ctx: Context;
  beforeEach(givenPrimeNumbers);

  class MyControllerWithGetter {
    @inject.view(Context.bindingTagFilter('prime'), {watch: true})
    getter: Getter<string[]>;
  }

  class MyControllerWithValues {
    constructor(
      @inject.view(Context.bindingTagFilter('prime'))
      public values: string[],
    ) {}
  }

  class MyControllerWithTracker {
    @inject.view(Context.bindingTagFilter('prime'))
    view: ContextView<string[]>;
  }

  it('injects as getter', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithGetter);
    const inst = await ctx.get<MyControllerWithGetter>('my-controller');
    const getter = inst.getter;
    expect(await getter()).to.eql([3, 5]);
    // Add a new binding that matches the filter
    givenPrime(ctx, 7);
    // The getter picks up the new binding
    expect(await getter()).to.eql([3, 7, 5]);
  });

  it('injects as values', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithValues);
    const inst = await ctx.get<MyControllerWithValues>('my-controller');
    expect(inst.values).to.eql([3, 5]);
  });

  it('injects as a view', async () => {
    ctx.bind('my-controller').toClass(MyControllerWithTracker);
    const inst = await ctx.get<MyControllerWithTracker>('my-controller');
    const view = inst.view;
    expect(await view.values()).to.eql([3, 5]);
    // Add a new binding that matches the filter
    // Add a new binding that matches the filter
    givenPrime(ctx, 7);
    // The view picks up the new binding
    expect(await view.values()).to.eql([3, 7, 5]);
    ctx.unbind('prime.7');
    expect(await view.values()).to.eql([3, 5]);
  });

  function givenPrimeNumbers() {
    ctx = givenServerWithinAnApp();
    givenPrime(ctx, 3);
    givenPrime(ctx.parent!, 5);
  }

  function givenPrime(_ctx: Context, p: number) {
    _ctx
      .bind(`prime.${p}`)
      .to(p)
      .tag('prime');
  }
});

describe('ContextEventListener - listens on matching bindings', () => {
  let server: Context;
  let contextListener: MyListenerForControllers;
  beforeEach(givenControllerListener);

  it('receives notifications of matching binding events', async () => {
    // We have ctx: 1, parent: 2
    expect(await getControllers()).to.eql(['1', '2']);
    server.unbind('controllers.1');
    // Now we have parent: 2
    expect(await getControllers()).to.eql(['2']);
    server.parent!.unbind('controllers.2');
    // All controllers are gone from the context chain
    expect(await getControllers()).to.eql([]);
    // Add a new controller - ctx: 3
    givenController(server, '3');
    expect(await getControllers()).to.eql(['3']);
  });

  class MyListenerForControllers implements ContextEventListener {
    controllers: Set<string> = new Set();
    filter = Context.bindingTagFilter('controller');
    listen(event: ContextEventType, binding: Readonly<Binding<unknown>>) {
      if (event === 'bind') {
        this.controllers.add(binding.tagMap.name);
      } else if (event === 'unbind') {
        this.controllers.delete(binding.tagMap.name);
      }
    }
  }

  function givenControllerListener() {
    server = givenServerWithinAnApp();
    contextListener = new MyListenerForControllers();
    server.subscribe(contextListener);
    givenController(server, '1');
    givenController(server.parent!, '2');
    return contextListener;
  }

  function givenController(_ctx: Context, _name: string) {
    class MyController {
      name = _name;
    }
    _ctx
      .bind(`controllers.${_name}`)
      .toClass(MyController)
      .tag('controller', {name: _name});
  }

  async function getControllers() {
    return new Promise<string[]>(resolve => {
      // Wrap it inside `setImmediate` to make the events are triggered
      setImmediate(() => resolve(Array.from(contextListener.controllers)));
    });
  }
});

function givenServerWithinAnApp() {
  const parent = new Context('app');
  const ctx = new Context(parent, 'server');
  return ctx;
}
