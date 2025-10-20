import GObject from "gi://GObject"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import AstalIO from "gi://AstalIO"

export enum TailscaleState {
  DISCONNECTED = "disconnected",
  CONNECTED = "connected",
  EXIT_NODE = "exit-node",
}

export interface ExitNode {
  id: string
  name: string
  location?: string
}

export interface TailscaleStatus {
  state: TailscaleState
  backendState: string
  exitNodeName?: string
  exitNodeId?: string
}

class TailscaleService extends GObject.Object {
  static {
    GObject.registerClass(
      {
        Properties: {
          status: GObject.ParamSpec.jsobject(
            "status",
            "Status",
            "Tailscale connection status",
            GObject.ParamFlags.READABLE,
          ),
          state: GObject.ParamSpec.string(
            "state",
            "State",
            "Current tailscale state",
            GObject.ParamFlags.READABLE,
            TailscaleState.DISCONNECTED,
          ),
          iconName: GObject.ParamSpec.string(
            "icon-name",
            "Icon Name",
            "Icon representing the current state",
            GObject.ParamFlags.READABLE,
            "network-offline-symbolic",
          ),
          menuModel: GObject.ParamSpec.object(
            "menu-model",
            "Menu Model",
            "GTK menu model for exit nodes",
            GObject.ParamFlags.READABLE,
            Gio.MenuModel.$gtype,
          ),
          actionGroup: GObject.ParamSpec.object(
            "action-group",
            "Action Group",
            "Action group for menu actions",
            GObject.ParamFlags.READABLE,
            Gio.ActionGroup.$gtype,
          ),
        },
        Signals: {},
      },
      this,
    )
  }

  private _status: TailscaleStatus = {
    state: TailscaleState.DISCONNECTED,
    backendState: "Stopped",
  }

  private _exitNodes: ExitNode[] = []
  private _menu: Gio.Menu = new Gio.Menu()
  private _actionGroup: Gio.SimpleActionGroup = new Gio.SimpleActionGroup()

  get status(): TailscaleStatus {
    return this._status
  }

  get state(): TailscaleState {
    return this._status.state
  }

  get iconName(): string {
    switch (this._status.state) {
      case TailscaleState.DISCONNECTED:
        return "network-offline-symbolic"
      case TailscaleState.CONNECTED:
        return "network-vpn-symbolic"
      case TailscaleState.EXIT_NODE:
        return "network-vpn-acquiring-symbolic"
      default:
        return "network-offline-symbolic"
    }
  }

  get menuModel(): Gio.MenuModel {
    return this._menu
  }

  get actionGroup(): Gio.ActionGroup {
    return this._actionGroup
  }

  private parseStatus(jsonOutput: string): TailscaleStatus {
    try {
      const data = JSON.parse(jsonOutput)

      // Check if tailscale is running
      if (data.BackendState !== "Running") {
        return {
          state: TailscaleState.DISCONNECTED,
          backendState: data.BackendState || "Stopped",
        }
      }

      // Parse available exit nodes
      const exitNodes: ExitNode[] = []
      let usingExitNode = false
      let exitNodeName: string | undefined
      let exitNodeId: string | undefined

      if (data.Peer) {
        for (const [peerId, peer] of Object.entries(data.Peer as Record<string, any>)) {
          if (peer.ExitNodeOption === true) {
            // Use DNSName (or HostName as fallback) for the id that we'll pass to tailscale
            const nodeId = peer.DNSName || peer.HostName || peerId
            const displayName = peer.HostName || peer.DNSName || peerId
            const location = peer.Location?.City && peer.Location?.Country
              ? `${peer.Location.City}, ${peer.Location.Country}`
              : undefined

            exitNodes.push({
              id: nodeId,
              name: displayName,
              location: location,
            })
          }

          if (peer.ExitNode === true) {
            usingExitNode = true
            exitNodeName = peer.HostName || peer.DNSName
            exitNodeId = peer.DNSName || peer.HostName || peerId
          }
        }
      }

      // Update exit nodes if changed
      if (JSON.stringify(exitNodes) !== JSON.stringify(this._exitNodes)) {
        this._exitNodes = exitNodes
        this.rebuildMenu()
      }

      if (usingExitNode) {
        return {
          state: TailscaleState.EXIT_NODE,
          backendState: data.BackendState,
          exitNodeName,
          exitNodeId,
        }
      }

      return {
        state: TailscaleState.CONNECTED,
        backendState: data.BackendState,
      }
    } catch (e) {
      console.error("Failed to parse tailscale status:", e)
      return {
        state: TailscaleState.DISCONNECTED,
        backendState: "Error",
      }
    }
  }

  private rebuildMenu() {
    this._menu.remove_all()

    if (this._exitNodes.length > 0) {
      const section = Gio.Menu.new()

      // Add "None" option
      const noneItem = Gio.MenuItem.new("None", null)
      noneItem.set_action_and_target_value("tailscale.exit-node", new GLib.Variant("s", ""))
      section.append_item(noneItem)

      // Add all exit nodes
      for (const node of this._exitNodes) {
        const label = node.location ? `${node.name} (${node.location})` : node.name
        const item = Gio.MenuItem.new(label, null)
        item.set_action_and_target_value("tailscale.exit-node", new GLib.Variant("s", node.id))
        section.append_item(item)
      }

      this._menu.append_section(null, section)
    }

    this.notify("menu-model")
  }

  private setExitNode(nodeId: string) {
    try {
      AstalIO.Process.execv(['tailscale', 'set', '--exit-node', nodeId])

      // Force immediate update
      setTimeout(() => this.updateStatus(), 500)
    } catch (e) {
      console.error(`Failed to set exit node to ${nodeId}:`, e)
    }
  }

  private updateExitNodeState() {
    // Update the stateful action to reflect current exit node
    const currentNodeId = this._status.exitNodeId || ""
    const action = this._actionGroup.lookup_action("exit-node") as Gio.SimpleAction
    if (action) {
      action.set_state(new GLib.Variant("s", currentNodeId))
    }
  }

  private updateStatus() {
    try {
      const output = AstalIO.Process.exec("tailscale status --json")
      const newStatus = this.parseStatus(output)

      if (
        newStatus.state !== this._status.state ||
        newStatus.exitNodeName !== this._status.exitNodeName ||
        newStatus.exitNodeId !== this._status.exitNodeId
      ) {
        this._status = newStatus
        this.notify("status")
        this.notify("state")
        this.notify("icon-name")
        this.updateExitNodeState()
      }
    } catch (e) {
      console.error("Failed to get tailscale status:", e)
      if (this._status.state !== TailscaleState.DISCONNECTED) {
        this._status = {
          state: TailscaleState.DISCONNECTED,
          backendState: "Error",
        }
        this.notify("status")
        this.notify("state")
        this.notify("icon-name")
        this.updateExitNodeState()
      }
    }
  }

  constructor() {
    super()

    // Set up stateful action for exit node selection (radio menu)
    const exitNodeAction = Gio.SimpleAction.new_stateful(
      "exit-node",
      new GLib.VariantType("s"),
      new GLib.Variant("s", "")
    )
    exitNodeAction.connect("activate", (_action, parameter) => {
      if (parameter) {
        const nodeId = parameter.get_string()[0]
        this.setExitNode(nodeId)
      }
    })
    this._actionGroup.add_action(exitNodeAction)

    // Initial update
    this.updateStatus()

    // Poll every 3 seconds
    AstalIO.Time.interval(3000, () => {
      this.updateStatus()
    })
  }
}

// Singleton instance
let instance: TailscaleService | null = null

export function getTailscale(): TailscaleService {
  if (!instance) {
    instance = new TailscaleService()
  }
  return instance
}
