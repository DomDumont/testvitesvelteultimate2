<script lang="ts">
  import type { MatPreset } from './types';

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
  export let presets: MatPreset[];
  export let selectedPresetId: string | null;
  export let newPresetName: string;
  export let canLoadPreset: boolean;
  export let canDeletePreset: boolean;
  export let canSavePreset: boolean;
  export let onPresetSelect: (event: Event) => void;
  export let onPresetLoad: () => void;
  export let onPresetDelete: () => void;
  export let onPresetNameInput: (event: Event) => void;
  export let onPresetSave: () => void;
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
  <div class="preset-controls">
    <label class="preset-row">
      Presets
      <div class="preset-actions">
        <select value={selectedPresetId ?? ''} on:change={onPresetSelect}>
          <option value="">Select preset…</option>
          {#each presets as preset}
            <option value={preset.id} selected={preset.id === selectedPresetId}>
              {preset.name}
            </option>
          {/each}
        </select>
        <button type="button" class="secondary" on:click={onPresetLoad} disabled={!canLoadPreset}>
          Load
        </button>
        <button type="button" class="secondary" on:click={onPresetDelete} disabled={!canDeletePreset}>
          Delete
        </button>
      </div>
    </label>
    <label class="preset-row">
      Save preset
      <div class="preset-actions">
        <input
          type="text"
          value={newPresetName}
          placeholder="Preset name"
          on:input={onPresetNameInput}
        />
        <button type="button" on:click={onPresetSave} disabled={!canSavePreset}>
          Save
        </button>
      </div>
    </label>
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

  .preset-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .preset-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }

  .preset-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .preset-actions select,
  .preset-actions input {
    flex: 1;
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

    .preset-controls {
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }

    .preset-actions {
      flex-wrap: wrap;
    }

    .preset-actions button {
      flex: 1 1 100px;
    }
  }
</style>
