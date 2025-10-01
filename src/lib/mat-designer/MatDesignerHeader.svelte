<script lang="ts">
  export let matWidth: number;
  export let matHeight: number;
  export let unit: string;
  export let unitOptions: string[];
  export let previewScale: number;
  export let minSize: number;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let onMatWidthChange: (event: Event) => void;
  export let onMatHeightChange: (event: Event) => void;
  export let onUnitChange: (event: Event) => void;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onPrint: () => void;
</script>

<header>
  <div class="header-row">
    <h1>Mat Designer</h1>
    <div class="history-actions">
      <button
        type="button"
        class="secondary"
        on:click={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
      >
        Undo
      </button>
      <button
        type="button"
        class="secondary"
        on:click={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z)"
      >
        Redo
      </button>
      <button
        type="button"
        class="secondary print-action"
        on:click={onPrint}
        title="Print or Save as PDF"
      >
        Print / PDF
      </button>
    </div>
  </div>
  <div class="mat-controls">
    <label>
      Mat Width ({unit})
      <input
        type="number"
        min={minSize}
        value={matWidth}
        on:change={onMatWidthChange}
      />
    </label>
    <label>
      Mat Height ({unit})
      <input
        type="number"
        min={minSize}
        value={matHeight}
        on:change={onMatHeightChange}
      />
    </label>
    <label>
      Units
      <select value={unit} on:change={onUnitChange}>
        {#each unitOptions as option}
          <option value={option} selected={option === unit}>{option}</option>
        {/each}
      </select>
    </label>
    <span class="scale">Preview scale: {(previewScale * 100).toFixed(0)}%</span>
  </div>
</header>

<style>
  header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 600;
  }

  .history-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .mat-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    align-items: end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  .scale {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 500;
    align-self: end;
  }

  @media (max-width: 768px) {
    .mat-controls {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.6rem;
    }
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 1.25rem;
    }

    .header-row {
      align-items: stretch;
    }

    .history-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
