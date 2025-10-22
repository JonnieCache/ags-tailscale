import Gtk from "gi://Gtk?version=4.0"
import { createBinding, createComputed } from "ags"
import { getTailscale, TailscaleState } from "./service"

export default function Tailscale() {
  const tailscale = getTailscale()

  const iconName = createBinding(tailscale, "iconName")
  const status = createBinding(tailscale, "status")

  const tooltip = createComputed([status], (status) => {
    switch (status.state) {
      case TailscaleState.DISCONNECTED:
        return `Tailscale disconnected`
      case TailscaleState.CONNECTED:
        return `Tailscale connected`
      case TailscaleState.EXIT_NODE:
        return `Tailscale connected\n\nExit Node: ${status.exitNodeName || "Unknown"}`
      default:
        return "Unknown"
    }
  })

  const stateClass = createComputed([status], (status) => {
    var classes = ["tailscale"];
    switch (status.state) {
      case TailscaleState.DISCONNECTED:
        classes.push("tailscale-disconnected")
      case TailscaleState.CONNECTED:
        classes.push("tailscale-connected")
      case TailscaleState.EXIT_NODE:
        classes.push("tailscale-exit-node")
    }

    return classes;
  })

  const init = (btn: Gtk.MenuButton) => {
    btn.menuModel = tailscale.menuModel
    btn.insert_action_group("tailscale", tailscale.actionGroup)

    // Update menu when it changes
    tailscale.connect("notify::menu-model", () => {
      btn.menuModel = tailscale.menuModel
    })
  }

  return (
    <menubutton $={(self) => init(self)} tooltipText={tooltip}>
      <image iconName={iconName} cssClasses={stateClass} />
    </menubutton>
  )
}
