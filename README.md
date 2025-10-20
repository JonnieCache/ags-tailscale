# AGS Tailscale Widget

A Tailscale status indicator and exit node selector for [AGS](https://github.com/Aylur/ags) (Astal/GTK4).

## Features

- Shows connection status with GTK icons
- Menu for selecting exit nodes

## Installation

Add this repo to your `package.json`

## Usage

```typescript
import Tailscale from "ags-tailscale";

// In your bar or panel:
<Tailscale />;
```

### Styling

The widget applies these CSS classes based on state:

- `.tailscale` - Base class for the icon
- `.tailscale-disconnected` - When disconnected
- `.tailscale-connected` - When connected
- `.tailscale-exit-node` - When using an exit node

## Requirements

- AGS 3.0 (from the master branch, I haven't tested it with 2.x)
- Appropriate permissions to run `tailscale status` and `tailscale set` - given like so:

```bash
sudo tailscale set --operator=<USERNAME>
```

## API

### Service

```typescript
import { getTailscale, TailscaleState } from "ags-tailscale/service"

const tailscale = getTailscale() // Singleton service

// Properties (GObject):
tailscale.status      // TailscaleStatus object
tailscale.state       // Current state string
tailscale.iconName    // Icon name for current state
tailscale.menuModel   // Gio.MenuModel for GTK menu
tailscale.actionGroup // Gio.ActionGroup for menu actions
```

## Contributing

Go nuts. I just added the features I wanted, if there's others you need - make a PR.

## License

MIT
