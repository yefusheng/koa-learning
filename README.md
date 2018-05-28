

 [从零开始的koa实战项目](https://github.com/YuQian2015/koa-learning/blob/master/develop-doc/koa%E5%AD%A6%E4%B9%A0%E7%AC%94%E8%AE%B0.md) 文档

以下是koa学习笔记：

# koa学习笔记——application.js 

## 创建服务

```js
const Koa = require('koa');
const app = new Koa();
app.listen(3000);
```

在上面的例子中，使用 `app.listen(3000)`  来创建一个服务， `app.listen(…)` 实际上是`http.createServer(app.callback()).listen(…)`  方法的语法糖:

```js
  listen(...args) {
	debug('listen');
	const server = http.createServer(this.callback()); 
	return server.listen(...args);
  }
```

## 处理请求 - callback

`this.callback()` 首先是使用 `koa-compose` 将应用的中间件进行了合并，返回了一个方法 `handleRequest`  来处理node的http请求。在`handleRequest`  中不仅创建了 context 上下文，还调用了应用本身的 `handleRequest` 函数来处理请求。

```js
  callback() {
    const fn = compose(this.middleware); // 合并中间件

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res); // 在这里创建了上下文
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }
```
下面是应用的 `handleRequest` 函数，它接收 `callback` 方法中传递的上下文 `ctx` 和中间件`fnMiddleware` ，然后把 `ctx` 作为`fnMiddleware`的参数传递。当中间件执行完毕之后，会调用应用的 `respond()` 接收 `ctx` ，然后对响应进行处理。
```js

  /**
   * Handle request in callback.
   *
   * @api private
   */

  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror); // 将创建的上下文传递给中间件，最终返回响应
  }
```

## 上下文 - context

> 待补充



## 中间件-Middleware

### 使用 - app.use(function)

将给定的中间件方法添加到此应用程序。

```js
app.use(fn);
```

当我们执行` use()` 时，会先判断传递的中间件是否是一个函数，如果不是就报出错误，再判断中间件是否是旧版的生成器 `generator` ，如果是，就使用 `koa-convert ` 来转换成新的中间件，最后将中间件push到 `middleware` 数组里面。

```js
  /**
   * Use the given middleware `fn`.
   *
   * Old-style middleware will be converted.
   *
   * @param {Function} fn
   * @return {Application} self
   * @api public
   */

  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
  }
```

从上面的源码我们可以看出，当我们在应用里面使用多个中间件时，`koa` 都会将它们放在自身的一个数组中。

### 中间件合并 - koa-compose

前面的介绍我们已经知道，在调用use方法时，我们会吧所有的中间件都放到应用的一个数组里面，最终在执行callback时被调用。而在callback中，中间件被 `koa-compose` 进行了压缩。我们来看  `koa-compose` 到底做了什么。

源码：

```js
'use strict'

/**
 * Expose compositor.
 */

module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

解析：首先compose会先检测我们的中间件是否是一个数组，然后再开始遍历，并且对每一项都做了判断，看是否是一个函数。

dispatch 会返回一个Promise， 一开始执行dispatch()时，传递参数0，那么就会执行第一个中间件：

```js
Promise.resolve(function(context, next){ // 这里的next指向了dispatch.bind(null, i + 1)，也就是dispatch(1)
    // 中间件1的代码
}());
```

加入中间件里面写了next():

```js
Promise.resolve(function(context, next){
    // 中间件1的代码
    next()
    // 中间件1的后半部分代码
}());


// 结果
Promise.resolve(function(context, 中间件2){
    // 中间件1的代码
    Promise.resolve(function(context, next){ // 这里的next同样是指向下一个中间件的
        // 中间件2的代码
    }())
    // 中间件一第二部分代码
}());
```

以此类推，如果需要执行第三个中间件，我们也需要在第二个中间件里面添加next()

```js
Promise.resolve(function(context, 中间件2){
	//中间件一第一部分代码
	Promise.resolve(function(context, 中间件3){
		//中间件二第一部分代码
		Promise(function(context){
			//中间件三代码
		}());
		//中间件二第二部分代码
	})
	//中间件一第二部分代码
}());
```

执行到最后一个中间件时，dispatch 会调用这个Promise的next()，接着代码会从中间件三开始，再执行中间件二的第二部分代码，执行完毕，开始执行中间一第二部分代码，执行完毕，所有中间件加载完成。

 可以看到，Koa2.x是从第一个中间件开始，遇到await/yield next，就中断本中间件的代码执行，跳转到对应的下一个中间件执行，一直到最后一个中间件，中间件代码执行完成之后又执行上一个中间件await/yield next之后的代码，直到全部执行结束。

最终在调用app.listen()时，`koa` 放在 `middleware`  数组里面的中间件将会被合并，在处理响应的时候被调用。

### 转换中间件

我们来对比一下旧的和新的中间件，旧的中间件是一个传统的 generator  ，我们都是通过调用它的 next 来执行中间件的 `next` ，新的中间件是一个 promise 。

```js
function * legacyMiddleware (next) {
  // before
  yield next
  // after
}
 
function modernMiddleware (ctx, next) {
  // before
  return next().then(() => {
    // after
  })
}
```

> 待补充

### 写法

koa2用采用了es6，7的新特性，因为后端的很多操作方法，比如文件，数据库，都是异步的，所以这种将异步写法变为同步写法，是代码的可读性大大提高。

以前采用callback：

```js
exports.getUserList = function() { 
	user.find({
	 _id: id,
	}, arr, function(e, numberAffected, raw) {
	  if(e){
		  respondata={
		    "code":"000",
		    "message":"error"
		  };
	  }else{
		  respondata={
		    "code":"200",
		    "message":"success"
		  };
	  }
	});
}

```

现在可以用 async await：

```js
exports.getUserList = async (ctx, next) => {
    try {
        let list = await user.find();
        let respon = {
            code: '200',
            message: 'success',
            data: list
        }
        return respon;
    } catch (err) {
        let respon = {
            code: '000',
            message: 'error',
            data: err
        }
        return respon;
    }
}
```

### 总结

中间件类似于一个过滤器，在客户端和应用程序之间处理请求和响应。

```js
.middleware1 {
  // (1) do some stuff
  .middleware2 {
    // (2) do some other stuff
    .middleware3 {
      // (3) NO next yield !
      // this.body = 'hello world'
    }
    // (4) do some other stuff later
  }
  // (5) do some stuff lastest and return
}
```

中间件的执行很像一个洋葱，但并不是一层一层的执行，而是以next为分界，先执行本层中next以前的部分，当下一层中间件执行完后，再执行本层next以后的部分。

![koa-middleware](develop-doc/koa/koa-middleware.png)

```js
let koa = require('koa');
let app = new koa();

app.use((ctx, next) => {
  console.log(1)
  next(); // next不写会报错
  console.log(5)
});

app.use((ctx, next) => {
  console.log(2)
  next();
  console.log(4)
});

app.use((ctx, next) => {
  console.log(3)
  ctx.body = 'Hello World';
});

app.listen(3000);
// 打印出1、2、3、4、5
```

上述简单的应用打印出1、2、3、4、5，这就是一个洋葱结构，从上往下一层一层进来，再从下往上一层一层回去，解决复杂应用中频繁的回调而设计的级联代码，并不直接把控制权完全交给下一个中间件，而是碰到next去下一个中间件，等下面都执行完了，还会执行next以下的内容。



## Response处理

在前面的介绍之后可以看到，在请求经过中间件的处理完成之后，就会调用 callback 函数里面的 `handleResponse ` 来处理响应，`handleResponse ` 调了应用本身的 `respond` 



koa处理响应的实现：

```js
/**
 * Response helper.
 */

function respond(ctx) {
  // allow bypassing koa
  if (false === ctx.respond) return;

  const res = ctx.res;
  if (!ctx.writable) return;  // 判断是否是context是否是可写的。

  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) { // 如果状态码是不需要返回body的类型，如果不希望返回body，statuses.empty 返回true
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' == ctx.method) {
    if (!res.headersSent && isJSON(body)) {
      ctx.length = Buffer.byteLength(JSON.stringify(body));
    }
    return res.end();
  }

  // status body
  if (null == body) {
    body = ctx.message || String(code);
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
```

> 待补充

# koa学习笔记——context.js

> 待更新

# koa学习笔记——request.js

> 待更新

# koa学习笔记——response.js

> 待更新
