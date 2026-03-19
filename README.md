# 🧶 Yarn Forge: Crochet Simulator

Yarn Forge is a powerful, web-based 3D crochet pattern simulator and designer.

[Try it now!](https://benjamin-cates.github.io/yarn-forge)

## Features

- **Real-time 3D Visualization**: Powered by [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber).
- **Interactive Editor**: Live validation of stitch counts and instant feedback as you type.
- **Pattern Examples**: Pre-loaded examples to get started quickly with common shapes like spheres, flat circles, and more.

## Pattern Syntax

Patterns are written line-by-line, where each line typically represents a row or round.

### Basic Stitches
- `sc`: Single Crochet
- `hdc`: Half Double Crochet
- `dc`: Double Crochet
- `tc`: Treble Crochet
- `ch`: Chain
- `sk`: Skip
- `slst`: Slip Stitch (often used as `join`)

### Shaping & Logic
- `inc`: Increase (2 sc in next)
- `dec`: Decrease (sc 2 together)
- `together` / `tog`: Cluster multiple stitches into one top (e.g., `(sc, dc) together`)
- `in [marker]`: Work stitches into a specific tagged location.
- `6x(...)`: Multipliers for repeating sequences.
- `#tag`: Mark a stitch for future reference (e.g., `sc#start`).

### Example Pattern (Sphere)
```text
6 sc
6 inc
6x(sc, inc)
6x(2 sc, inc)
24 sc
6x(3 sc, inc)
6x(3 sc, dec)
24xsc
6x(2 sc, dec)
6x(sc, dec)
6 dec
```