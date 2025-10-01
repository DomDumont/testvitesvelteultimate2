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
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    max-width: 720px;
    text-align: center;
  }

  .mat-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    overflow: auto;
    padding: 0.4rem;
    box-sizing: border-box;
  }

  .mat {
    position: relative;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: #fff;
    overflow: hidden;
    cursor: pointer;
    margin: 0 auto;
  }

  .mat:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #2563eb;
  }

  .mat::after {
    content: none;
  }

  .preview-window {
    position: absolute;
    border: 1px solid #cbd5f5;
    background: rgba(248, 250, 252, 0.95);
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.35rem;
    text-align: center;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    cursor: pointer;
  }

  .preview-window:hover {
    background: rgba(241, 245, 249, 0.96);
  }

  .preview-window:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .preview-window.selected {
    border-color: #2563eb;
    background: #eef2ff;
  }

  .preview-window span {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1f2937;
  }

  .preview-window small {
    font-size: 0.72rem;
    color: #4b5563;
  }

  .dimension {
    position: absolute;
    pointer-events: none;
    color: #1f2937;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    z-index: 2;
  }

  .dimension span {
    position: absolute;
    padding: 0.08rem 0.35rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.45);
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
    border-top: 1px solid rgba(148, 163, 184, 0.7);
  }

  .dimension.horizontal span {
    left: 50%;
    transform: translate(-50%, -140%);
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
    border-left: 1px solid rgba(148, 163, 184, 0.7);
  }

  .dimension.vertical span {
    top: 50%;
    left: 0;
    transform: translate(-120%, -50%) rotate(-90deg);
  }

  .dimension.vertical.right span {
    left: 0;
    transform: translate(120%, -50%) rotate(-90deg);
  }

  .dimension.mat-dimension span {
    background: #eef2ff;
    border-color: rgba(59, 130, 246, 0.35);
  }

  .dimension.mat-dimension::before {
    border-color: rgba(59, 130, 246, 0.5);
  }

  .dimension.margin span {
    background: rgba(248, 250, 252, 0.94);
    border-color: rgba(148, 163, 184, 0.45);
  }

  .dimension.spacing span {
    background: rgba(219, 234, 254, 0.7);
    border-color: rgba(99, 102, 241, 0.4);
  }

  .dimension.spacing.horizontal::before {
    border-top-color: rgba(99, 102, 241, 0.5);
    border-top-style: dashed;
  }

  .dimension.spacing.vertical::before {
    border-left-color: rgba(99, 102, 241, 0.5);
    border-left-style: dashed;
  }

  .clear-selection {
    align-self: center;
    background: #fff;
    color: #374151;
    border-color: #d1d5db;
  }

  .clear-selection:not(:disabled):hover {
    background: #f3f4f6;
    border-color: #cbd5f5;
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
      padding: 0.3rem;
    }

    .clear-selection {
      align-self: stretch;
    }
  }
</style>
