import { pcbLayoutProps } from "@tscircuit/props"
import type {
  PcbSolderPaste,
  PcbSolderPastePill,
  PcbSolderPasteRotatedPill,
} from "circuit-json"
import { transformPcbSolderPastePill } from "lib/utils/pcb/transform-pcb-solder-paste-pill"
import { PrimitiveComponent } from "../base-components/PrimitiveComponent"
import type { SmtPad } from "./SmtPad"

type PcbSolderPasteId = PcbSolderPaste["pcb_solder_paste_id"]

export class ImportedPillSolderPaste extends PrimitiveComponent<
  typeof pcbLayoutProps
> {
  isPcbPrimitive = true
  pcb_solder_paste_id: PcbSolderPasteId | null = null
  private readonly geometry: Pick<
    PcbSolderPastePill,
    "width" | "height" | "radius"
  >

  /** Aperture-local mm, right-handed +X right, +Y up, +Z above; center is a point. */
  constructor(
    aperture: PcbSolderPastePill | PcbSolderPasteRotatedPill,
    private readonly smtPad?: Pick<SmtPad, "pcb_smtpad_id">,
  ) {
    super({
      pcbX: aperture.x,
      pcbY: aperture.y,
      layer: aperture.layer,
      pcbRotation:
        aperture.shape === "rotated_pill" ? aperture.ccw_rotation : 0,
    })
    this.geometry = {
      width: aperture.width,
      height: aperture.height,
      radius: aperture.radius,
    }
  }

  get config() {
    return {
      componentName: "ImportedPillSolderPaste",
      zodProps: pcbLayoutProps,
    }
  }

  getPcbSize() {
    return { width: this.geometry.width, height: this.geometry.height }
  }

  doInitialPcbPrimitiveRender(): void {
    if (this.root?.pcbDisabled) return
    const { maybeFlipLayer } = this._getPcbPrimitiveFlippedHelpers()
    this.pcb_solder_paste_id = this.root!.db.pcb_solder_paste.insert({
      ...transformPcbSolderPastePill(
        this.geometry,
        this._computePcbGlobalTransformBeforeLayout(),
      ),
      layer: maybeFlipLayer(this._parsedProps.layer ?? "top"),
      pcb_smtpad_id: this.smtPad?.pcb_smtpad_id ?? undefined,
      pcb_component_id:
        this.getPrimitiveContainer()?.pcb_component_id ?? undefined,
      pcb_group_id: this.getGroup()?.pcb_group_id ?? undefined,
      subcircuit_id: this.getSubcircuit().subcircuit_id ?? undefined,
    }).pcb_solder_paste_id
  }

  _moveCircuitJsonElements({
    deltaX,
    deltaY,
  }: { deltaX: number; deltaY: number }): void {
    if (!this.pcb_solder_paste_id) return
    const paste = this.root!.db.pcb_solder_paste.get(this.pcb_solder_paste_id)
    if (paste && (paste.shape === "pill" || paste.shape === "rotated_pill")) {
      this.root!.db.pcb_solder_paste.update(this.pcb_solder_paste_id, {
        x: paste.x + deltaX,
        y: paste.y + deltaY,
      })
    }
  }

  removePcbPrimitiveRender(): void {
    if (!this.pcb_solder_paste_id) return
    this.root!.db.pcb_solder_paste.delete(this.pcb_solder_paste_id)
    this.pcb_solder_paste_id = null
  }
}
