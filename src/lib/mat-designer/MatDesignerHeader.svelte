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
    gap: 1rem;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .history-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-end;
  }

  .mat-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .scale {
    font-size: 0.85rem;
    color: #6b7280;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    header {
      gap: 0.75rem;
    }

    .mat-controls {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 1.5rem;
    }

    .header-row {
      align-items: stretch;
    }

    .history-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
