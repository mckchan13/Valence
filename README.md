<h1>Valence</h1>
 
Valence is a library for constructing an extensible and easy to use API interface for handling IPC communications between an Electron main process and a forked child/utility process. The framework is modeled on REST architectural patterns with methods and functions familiar to and inspired by Express and Koa.js.
 
# Quick Start

1. Installing Valence

- Install via npm

```javascript
npm install valence
```

2. Then in your main and child process

```typescript
// Main process
const childScriptPath = path.join(__dirname, "./src/child.js");
const child = utilityProcess.fork(childScriptPath);

child.parentPort.on("message", (event) => {
  console.log(event.data)
  // will console log "Hello from the child!" when the child responds
})

child.parentPort.postMessage({
  request: { route: "sayHelloWorld", method: "GET" },
});

// Child process
const Valence = require("electron-valence");
const valence = new Valence();

valence.use("sayHelloWorld", (ctx, next) => {
  ctx.respond("Hello World from the child!");
});

valence.listen(() => {
  console.log("Listening on parent port...");
});
```

<p>
 
<h2 href="#howtouse"></h2>

# How to use

<h3 href="#desolverinstance"></h3>
 
### **Configuring Datasources**
 
Initiate a Valence instance and configure it with a specified datasource.
 
```javascript
const db = require("./src/db")
const Valence = require("electron-valence")

const valence = new Valence({ config : { db } })

valence.use("getAllPosts", async (ctx, next) => {
// db will be available in the the context object
const posts = await ctx.db.getAllPosts();
ctx.send(posts)
})

valence.listen();

````

<h3 href="#prehook"></h3>

### **Define Prehook and Route Handler Functions**


The middleware handler function signature:
```javascript
function middleware(ctx, next) {
  // handle business logic
  // call next to call the next function
  return next();
}
```

The first four parameters are the normal parameters for any resolver:

- `ctx`: Context object
- `next`: Calls the next middleware route handlers.

Prehooks run before any of the other route handlers.

```javascript
valence.usePrehook((ctx, next) => {
  const { request } = ctx;
  // handle logic to throw error if request is not valid
});
```

<h3 href="#pipeline"></h3>
 
### **Listening for message events from the parent port**
 
Call the listen method on the valence instance. This will setup all the route handlers, and set the "message" event listener to route incoming messages to the route.

The listen method accepts an optional callback that can be used when the child "message" event listener is set. The port that the child process is listening on is exposed as the first argument of the callback.

```javascript
valence.listen((port) => {
  const message = "Route handlers set, child is now listening."
  port.postMessage(message)
  console.log("Listening on the parent port")
});
```
