<script lang="ts">
  import type { EditableWindowKey, MatWindow } from './types';

  export let windows: MatWindow[];
  export let selectedIdSet: Set<number>;
  export let selectedCount: number;
  export let minSize: number;
  export let addWindow: () => void;
  export let removeSelected: () => void;
  export let toggleSelection: (id: number, additive: boolean) => void;
  export let updateWindow: (id: number, key: EditableWindowKey, value: number | string) => void;
  export let altKey: (event: MouseEvent | KeyboardEvent) => boolean;
</script>

<h2>Windows</h2>
<div class="actions">
  <button type="button" on:click={addWindow}>Add Window</button>
  <button type="button" on:click={removeSelected} disabled={!selectedCount}>
    Remove Selected
  </button>
</div>
<div class="table-wrapper">
  <table>
  <thead>
    <tr>
      <th></th>
      <th>Name</th>
      <th>X</th>
      <th>Y</th>
      <th>Width</th>
      <th>Height</th>
    </tr>
  </thead>
  <tbody>
    {#each windows as window (window.id)}
      <tr
        class:selected={selectedIdSet.has(window.id)}
        on:click={(event) => toggleSelection(window.id, altKey(event))}
      >
        <td data-label="Select">
          <input
            type="checkbox"
            checked={selectedIdSet.has(window.id)}
            on:click|stopPropagation
            on:change={() => toggleSelection(window.id, true)}
          />
        </td>
        <td data-label="Name">
          <input
            type="text"
            value={window.name}
            on:click|stopPropagation
            on:change={(event) =>
              updateWindow(window.id, 'name', event.currentTarget.value)}
          />
        </td>
        <td data-label="X">
          <input
            type="number"
            value={window.x}
            min="0"
            on:click|stopPropagation
            on:change={(event) =>
              updateWindow(window.id, 'x', event.currentTarget.valueAsNumber)}
          />
        </td>
        <td data-label="Y">
          <input
            type="number"
            value={window.y}
            min="0"
            on:click|stopPropagation
            on:change={(event) =>
              updateWindow(window.id, 'y', event.currentTarget.valueAsNumber)}
          />
        </td>
        <td data-label="Width">
          <input
            type="number"
            value={window.width}
            min={minSize}
            on:click|stopPropagation
            on:change={(event) =>
              updateWindow(window.id, 'width', event.currentTarget.valueAsNumber)}
          />
        </td>
        <td data-label="Height">
          <input
            type="number"
            value={window.height}
            min={minSize}
            on:click|stopPropagation
            on:change={(event) =>
              updateWindow(window.id, 'height', event.currentTarget.valueAsNumber)}
          />
        </td>
      </tr>
    {/each}
  </tbody>
</table>
</div>

<style>
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .table-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    table-layout: fixed;
    min-width: 520px;
  }

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    word-break: break-word;
  }

  td input {
    max-width: 100%;
    box-sizing: border-box;
  }

  tr.selected {
    background: rgba(79, 70, 229, 0.1);
  }

  @media (max-width: 640px) {
    .actions {
      flex-direction: column;
    }

    .actions button {
      width: 100%;
    }

    .table-wrapper {
      overflow: visible;
    }

    table {
      min-width: 0;
    }

    table,
    thead,
    tbody,
    th,
    tr,
    td {
      display: block;
    }

    thead {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    tbody {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    tr {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      background: #fff;
    }

    td {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      padding: 0;
      border: 0;
      width: 100%;
    }

    td::before {
      content: attr(data-label);
      font-weight: 600;
      color: #4b5563;
      font-size: 0.85rem;
    }

    td input[type='text'],
    td input[type='number'] {
      width: 100%;
      min-width: 0;
    }

    td:first-child {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }

    td:first-child::before {
      margin-right: 0;
    }

    td:first-child input[type='checkbox'] {
      flex-shrink: 0;
    }
  }
</style>
