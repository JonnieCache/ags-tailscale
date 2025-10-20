# AGS Tailscale Widget

A Tailscale status indicator and exit node selector for [AGS](https://github.com/Aylur/ags) (Astal/GTK4).

## Features

- Shows connection status with different icons:
  - Disconnected: `network-offline-symbolic`
  - Connected: `network-vpn-symbolic`
  - Using exit node: `network-vpn-acquiring-symbolic`
- Native GTK menu for selecting exit nodes
- Shows exit node locations (when available)
- Radio button checkmarks for active selection
- Automatically polls for status updates

## Installation

Add this repo to your `package.json`

## Usage

```typescript
import Tailscale from "ags-tailscale";

// In your bar or panel:
<Tailscale />;
```

### With Custom Styling

The widget applies these CSS classes based on state:

- `.tailscale` - Base class for the icon
- `.tailscale-disconnected` - When disconnected
- `.tailscale-connected` - When connected
- `.tailscale-exit-node` - When using an exit node

Add to your `style.scss`:

```scss
.tailscale {
  margin: 0 4px;

  &.tailscale-disconnected {
    color: @error_color;
  }

  &.tailscale-connected {
    color: @success_color;
  }

  &.tailscale-exit-node {
    color: @warning_color;
  }
}
```

## Requirements

- AGS 3.0 (from the master branch, I haven't tested it with 2.x)
- Tailscale CLI installed and accessible
- Appropriate permissions to run `tailscale status` and `tailscale set` - set like so:

````bash
tailscale set --operator=<USERNAME>
end

## API

### Service

```typescript
import { getTailscale, TailscaleState } from "./path/to/ags-tailscale/src/service"

const tailscale = getTailscale() // Singleton service

// Properties (GObject):
tailscale.status      // TailscaleStatus object
tailscale.state       // Current state string
tailscale.iconName    // Icon name for current state
tailscale.menuModel   // Gio.MenuModel for GTK menu
tailscale.actionGroup // Gio.ActionGroup for menu actions
````

## License

MIT
