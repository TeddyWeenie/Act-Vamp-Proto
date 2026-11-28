import { Mesh, type Material, type MeshBasicMaterial, type Object3D } from 'three';
import { readMaterialSource, type BuildingMaterialFactory, type MaterialSource } from './materials';
import type { OutlineShellFactory } from './outline';

interface BuildingPart {
  readonly mesh: Mesh;
  readonly source: MaterialSource;
  body: Material | null;
  shell: Mesh | null;
}

/**
 * One loaded GLB as the game draws it. It hides which meshes, materials and outline shells make
 * up the building: callers say what they want (a material kind, an outline, an opacity) and the
 * building keeps its parts consistent.
 */
export class CartoonBuilding {
  private readonly parts: BuildingPart[] = [];
  private outlineMaterial: MeshBasicMaterial | null = null;
  private outlineVisible = true;
  private currentOpacity = 1;

  constructor(public readonly root: Object3D) {
    root.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const first = Array.isArray(node.material) ? node.material[0] : node.material;
      if (!node.geometry.attributes.normal) node.geometry.computeVertexNormals();
      this.parts.push({ mesh: node, source: readMaterialSource(first), body: null, shell: null });
    });
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  /** Replace every body material with one from the given factory. */
  useMaterials(factory: BuildingMaterialFactory): void {
    for (const part of this.parts) {
      part.body?.dispose();
      part.body = factory.create(part.source);
      part.mesh.material = part.body;
    }
    this.applyOpacity();
  }

  /** Give every mesh an outline shell. Safe to call again: existing shells are kept. */
  addOutline(shells: OutlineShellFactory): void {
    this.outlineMaterial ??= shells.createMaterial();
    for (const part of this.parts) {
      if (part.shell) continue;
      part.shell = shells.createShell(part.mesh, this.outlineMaterial);
      part.shell.visible = this.outlineVisible;
      part.mesh.add(part.shell);
    }
    this.applyOpacity();
  }

  setOutlineVisible(visible: boolean): void {
    this.outlineVisible = visible;
    for (const part of this.parts) if (part.shell) part.shell.visible = visible;
  }

  /**
   * Fade the whole building, body and outline together (1 = solid).
   * For the "character behind a building" case keep the depth-only prepass in front of this:
   * the faded pass does not write depth.
   */
  setOpacity(opacity: number): void {
    this.currentOpacity = Math.min(1, Math.max(0, opacity));
    this.applyOpacity();
  }

  dispose(): void {
    for (const part of this.parts) {
      part.body?.dispose();
      if (part.shell) part.mesh.remove(part.shell);
      part.body = null;
      part.shell = null;
    }
    this.outlineMaterial?.dispose();
    this.outlineMaterial = null;
  }

  private applyOpacity(): void {
    const faded = this.currentOpacity < 1;
    const set = (material: Material | null) => {
      if (!material) return;
      if (material.transparent !== faded) material.needsUpdate = true;
      material.transparent = faded;
      material.opacity = this.currentOpacity;
      material.depthWrite = !faded;
    };
    for (const part of this.parts) set(part.body);
    set(this.outlineMaterial);
  }
}
