<script lang="ts">
  import type { ExtraDimension, MatDimensionOverlay, PositionedWindow } from './types';

  export let containerWidth: number;
  export let positionedWindows: PositionedWindow[];
  export let matDimensions: MatDimensionOverlay;
  export let extraDimensions: ExtraDimension[];
  export let unit: string;
  export let scaledMatWidth: number;
  export let scaledMatHeight: number;
  export let matWidth: number;
  export let matHeight: number;
  export let selectedIdSet: Set<number>;
  export let formatMeasurement: (length: number) => string;
  export let clearSelection: () => void;
  export let toggleSelection: (id: number, additive: boolean) => void;
  export let altKey: (event: MouseEvent | KeyboardEvent) => boolean;
  export let handleKeyActivate: (event: KeyboardEvent, callback: (event: KeyboardEvent) => void) => void;
  export let selectedCount: number;
</script>

<div class="preview-wrapper">
  <h2>Preview</h2>
  <div class="mat-container" bind:clientWidth={containerWidth}>
    <div
      class="mat"
      role="button"
      tabindex="0"
      aria-label="Clear selection"
      style={`width: ${scaledMatWidth}px; height: ${scaledMatHeight}px;`}
      on:click={clearSelection}
      on:keydown={(event) => handleKeyActivate(event, () => clearSelection())}
    >
      {#each positionedWindows as view (view.id)}
        <div
          class="preview-window"
          role="button"
          tabindex="0"
          aria-pressed={selectedIdSet.has(view.id)}
          aria-label={`${view.name} (${Math.round(view.width)} by ${Math.round(view.height)} ${unit})`}
          class:selected={selectedIdSet.has(view.id)}
          style={`left: ${view.scaledX}px; top: ${view.scaledY}px; width: ${view.scaledWidth}px; height: ${view.scaledHeight}px;`}
          on:click={(event) => {
            event.stopPropagation();
            toggleSelection(view.id, altKey(event));
          }}
          on:keydown={(event) =>
            handleKeyActivate(event, (keyboardEvent) =>
              toggleSelection(view.id, altKey(keyboardEvent))
            )}
        >
          <span>{view.name}</span>
          <small>{Math.round(view.width)}x{Math.round(view.height)} {unit}</small>
        </div>
        <div
          class="dimension horizontal"
          class:above={view.horizontal.position === 'above'}
          class:below={view.horizontal.position === 'below'}
          style={`left: ${view.horizontal.left}px; top: ${view.horizontal.top}px; width: ${view.horizontal.length}px;`}
        >
          <span>{formatMeasurement(view.width)}</span>
        </div>
        <div
          class="dimension vertical"
          class:left={view.vertical.position === 'left'}
          class:right={view.vertical.position === 'right'}
          style={`left: ${view.vertical.left}px; top: ${view.vertical.top}px; height: ${view.vertical.length}px;`}
        >
          <span>{formatMeasurement(view.height)}</span>
        </div>
      {/each}
      <div
        class="dimension horizontal mat-dimension"
        style={`left: ${matDimensions.horizontal.left}px; top: ${matDimensions.horizontal.top}px; width: ${matDimensions.horizontal.length}px;`}
      >
        <span>{formatMeasurement(matWidth)}</span>
      </div>
      <div
        class="dimension vertical mat-dimension"
        style={`left: ${matDimensions.vertical.left}px; top: ${matDimensions.vertical.top}px; height: ${matDimensions.vertical.length}px;`}
      >
        <span>{formatMeasurement(matHeight)}</span>
      </div>
      {#each extraDimensions as dim (dim.id)}
        <div
          class={`dimension ${dim.orientation} ${dim.modifier}`}
          style={dim.orientation === 'horizontal'
            ? `left: ${dim.left}px; top: ${dim.top}px; width: ${dim.length}px;`
            : `left: ${dim.left}px; top: ${dim.top}px; height: ${dim.length}px;`}
        >
          <span>{dim.label}</span>
        </div>
      {/each}
    </div>
  </div>
  <button type="button" class="clear-selection" on:click={clearSelection} disabled={!selectedCount}>
    Clear Selection
  </button>
</div>

<style>
  .preview-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1 1 360px;
    min-width: 320px;
    max-width: 720px;
  }

  .mat-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    overflow: auto;
    padding: 0.5rem;
    box-sizing: border-box;
  }

  .mat {
    position: relative;
    border: 4px solid #111827;
    border-radius: 0.75rem;
    background: repeating-linear-gradient(
      45deg,
      rgba(249, 250, 251, 1),
      rgba(249, 250, 251, 1) 12px,
      rgba(243, 244, 246, 1) 12px,
      rgba(243, 244, 246, 1) 24px
    );
    box-shadow: inset 0 0 30px rgba(15, 23, 42, 0.2);
    overflow: hidden;
    cursor: pointer;
    margin: 0 auto;
  }

  .mat:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 30px rgba(15, 23, 42, 0.2),
      inset 0 0 0 4px rgba(99, 102, 241, 0.4);
  }

  .mat::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 20px rgba(229, 231, 235, 0.35);
  }

  .preview-window {
    position: absolute;
    border: 3px solid rgba(99, 102, 241, 0.9);
    background: rgba(255, 255, 255, 0.85);
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.5rem;
    text-align: center;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    cursor: pointer;
  }

  .preview-window:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(59, 130, 246, 0.25);
  }

  .preview-window:focus-visible {
    outline: 3px solid rgba(34, 197, 94, 0.75);
    outline-offset: 2px;
  }

  .preview-window.selected {
    border-color: #22c55e;
    background: rgba(236, 253, 245, 0.95);
  }

  .preview-window span {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .preview-window small {
    font-size: 0.75rem;
    color: #4b5563;
  }

  .dimension {
    position: absolute;
    pointer-events: none;
    color: #111827;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    z-index: 2;
  }

  .dimension span {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(17, 24, 39, 0.22);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
  }

  .dimension.horizontal {
    height: 0;
  }

  .dimension.horizontal::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    border-top: 1px solid rgba(17, 24, 39, 0.55);
  }

  .dimension.horizontal.above span {
    transform: translate(-50%, -160%);
  }

  .dimension.horizontal.below span {
    transform: translate(-50%, 30%);
  }

  .dimension.vertical {
    width: 1px;
  }

  .dimension.vertical::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-left: 1px solid rgba(17, 24, 39, 0.55);
  }

  .dimension.vertical span {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(-120%, -50%) rotate(-90deg);
    transform-origin: center;
  }

  .dimension.vertical.right span {
    transform: translate(120%, -50%) rotate(-90deg);
  }

  .dimension.mat-dimension span {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.25);
  }

  .dimension.mat-dimension::before {
    border-color: rgba(37, 99, 235, 0.45);
  }

  .dimension.margin span {
    background: rgba(253, 230, 138, 0.45);
    border-color: rgba(202, 138, 4, 0.45);
  }

  .dimension.margin.horizontal::before {
    border-top-color: rgba(202, 138, 4, 0.55);
  }

  .dimension.margin.vertical::before {
    border-left-color: rgba(202, 138, 4, 0.55);
  }

  .dimension.spacing span {
    background: rgba(191, 219, 254, 0.3);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .dimension.spacing.horizontal::before {
    border-top-color: rgba(37, 99, 235, 0.55);
    border-top-style: dashed;
  }

  .dimension.spacing.vertical::before {
    border-left-color: rgba(37, 99, 235, 0.55);
    border-left-style: dashed;
  }

  .clear-selection {
    align-self: flex-end;
    background: #6b7280;
  }

  .clear-selection:not(:disabled):hover {
    background: #4b5563;
  }

  @media (max-width: 1024px) {
    .preview-wrapper {
      flex: 1 1 100%;
      min-width: 0;
      max-width: none;
    }
  }

  @media (max-width: 640px) {
    .preview-wrapper {
      min-width: 0;
    }

    .mat-container {
      padding: 0.25rem;
    }

    .clear-selection {
      align-self: stretch;
    }
  }
</style>
