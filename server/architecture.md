# Server architecture

### Core

The core is an authoritative server architecture. 

The idea is to process and simulate all game logic on the server, and periodically update every client with relevant state. 

Clients perform simulations of their own, but if their simulation is wrong or out of sync, it will be overriden by the server state. The server state becomes the `single source of truth` for the entire game. 

### Inputs

Clients send inputs to the server. An input is an abstract "action", with some parameters, such as `jump`, `move: { left }`, `spell: { id: fireball }`. These inputs are converted into events, which are processed by game systems. The `jump` input may be processed by a `physics` system, increasing the vertical velocity of the entity which the input originates from.

### State updates

Once every update, the synchronization system serializes state based on interest for every client into packets, and sends them out to clients. `interest` refers to the idea that an entity does not need to know about entities which it cannot be affected by due to being far away, invisible to each other, etc.

This server uses space-based interest management, where the world is divided into zones, and only entities in the same zone can ever see each other.

Some other interest management schemes are described [in this paper](https://www.cs.mcgill.ca/~jboula2/thesis.pdf).

The reason for dividing the world is to save bandwidth and processing power. Bandwidth is saved because instead of each packet being `N^2` in size, it is only `N*M`, where `N` is the number of players, and `M` is the number of entities visible to it. `M` will almost always be far lower than `N`.

# Implementation details

### Network architecture

The idea is two have two threads, so that the I/O does not interrupt the game systems, due to the soft real-time requirements of real-time games - an update must finish in a specific amount of time. 

There are two schedulers:
* Game system scheduler
* I/O scheduler

The game systems all access a joint event queue. The event queue is double-buffered, one is read-only, the other is write-only. The buffers are swapped at the end of every update. This is done so that systems don't receive an event in the middle of processing. 

The network system contains the incoming half of the client input MPSC queue, which it processes and turns into events. The outgoing half of the client input MPSC queue is inside each client connection. The client connection receives packets from its client, turning them into inputs, which it sends through the queue.

```
  client connections
           |
         input
           |
           v
        (network system)
              |
           network
            event
              |
              v
   -----event queue-----
     ^    |
     |  event
   event  |
     |    v
     systems
       .
       .
       .
    scheduler
```

### Database access

The I/O scheduler is re-used for asynchronous database access. Each system may send a query to the outgoing query queue, along with a callback. The callback will be called with the result once the query completes (either successfully or not). The callback is called from a different thread, so it must be thread-safe.

```
    scheduler
        .
        .
        .
    connection pool
           ^
           |
           v
  database query queue
        ^     |
        |  callback
      query   |
        |     v
        systems
```

### Game logic

The game uses a parallel ECS architecture. In ECS, systems are the base unit of logic, and components are the base unit of state. Components store arbitrary data. Systems access and transform components in arbitrary ways. This decoupling of state and logic creates a potentially easier to maintain structure. There are also clear performance gains, due to better cache locality (by storing components in contiguous arrays), or the potential for paralellization (due to knowing ahead of time which systems need to access which components).

A *very* simple example:
```rust
// components
#[derive(Clone, Copy, Default)]
struct Position {
  x: f32,
  y: f32
}
#[derive(Clone, Copy, Default)]
struct Velocity {
  x: f32,
  y: f32
}
/* AddAssign impl */
// systems
fn update_physics(pos: &mut Position, vel: &Velocity) {
  pos += vel;
}

fn main() {
  let mut positions = vec![Position::default(); 100];
  let mut velocities = vec![Velocity::default(); 100];
  // assume there is another system here which somehow changes `velocities`
  for n in 0..100 {
    update_physics(&mut positions[n], &velocities[n]);
  }
}
```

The potential for parallelization comes from being able to split the arrays into parts and process them on separate threads.