<script lang="ts">
  import { onMount } from "svelte";

  type MatWindow = {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type EditableWindowKey = "name" | "x" | "y" | "width" | "height";

  type MatDesignerState = {
    matWidth: number;
    matHeight: number;
    unit: string;
    windows: MatWindow[];
    selectedIds: number[];
    idCounter: number;
  };

  type PositionedWindow = MatWindow & {
    scaledX: number;
    scaledY: number;
    scaledWidth: number;
    scaledHeight: number;
    horizontal: {
      left: number;
      top: number;
      length: number;
      position: "above" | "below";
    };
    vertical: {
      left: number;
      top: number;
      length: number;
      position: "left" | "right";
    };
  };

  type MatDimensionOverlay = {
    horizontal: { left: number; top: number; length: number };
    vertical: { left: number; top: number; length: number };
  };

  type ExtraDimension = {
    id: string;
    orientation: 'horizontal' | 'vertical';
    left: number;
    top: number;
    length: number;
    label: string;
    modifier: 'margin' | 'spacing';
  };

  const MIN_SIZE = 20;
  const PREVIEW_MAX_WIDTH = 600;
  const PREVIEW_MAX_HEIGHT = 420;
  const HISTORY_LIMIT = 100;

  const MIN_PREVIEW_CONTAINER_WIDTH = 320;
  const MIN_PREVIEW_SCALE = 0.2;
  const MAT_CONTAINER_PADDING = 16;

  const DIMENSION_LABEL_MARGIN = 18;
  const DIMENSION_SAFE_PADDING = 12;

  const STORAGE_KEY = 'mat-designer-state/v1';

  let matWidth = 500;
  let matHeight = 350;
  let unit = "mm";
  let idCounter = 0;

  function createWindow({
    name,
    x = 40,
    y = 40,
    width = 140,
    height = 120
  }: Partial<Omit<MatWindow, "id" | "name">> & { name?: string } = {}): MatWindow {
    const id = ++idCounter;
    return {
      id,
      name: name ?? `Window ${id}`,
      x,
      y,
      width,
      height
    };
  }

  let windows: MatWindow[] = [
    createWindow({ name: "Main Window", x: 140, y: 100, width: 180, height: 200 })
  ];
  let selectedIds: number[] = windows.map((window) => window.id);

  let past: MatDesignerState[] = [];
  let future: MatDesignerState[] = [];

  let previewContainerWidth = PREVIEW_MAX_WIDTH;

  let previewScale = 1;

  let extraDimensions: ExtraDimension[] = [];

  let marginDimensions: ExtraDimension[] = [];
  let spacingDimensions: ExtraDimension[] = [];

  let storageReady = false;

  let positionedWindows: PositionedWindow[] = [];
  let matDimensions: MatDimensionOverlay = {
    horizontal: { left: 0, top: 0, length: 0 },
    vertical: { left: 0, top: 0, length: 0 }
  };

  const unitOptions = ["mm", "cm", "in"];

  const altKey = (event: MouseEvent | KeyboardEvent) =>
    event.shiftKey || event.metaKey || event.ctrlKey;

  function sanitizeDimension(value: number, fallback: number) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(value, MIN_SIZE);
  }

  function cloneWindows(list: MatWindow[]): MatWindow[] {
    return list.map((window) => ({ ...window }));
  }

  const clampValue = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
    Math.min(Math.max(value, min), max);

  function formatMeasurement(length: number) {
    const rounded = Math.round(length);
    return `${rounded} ${unit}`;
  }

  function loadPersistedState(): MatDesignerState | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<MatDesignerState>;
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.matWidth !== 'number' || typeof parsed.matHeight !== 'number') return null;

      const sanitizedWindows = Array.isArray(parsed.windows)
        ? parsed.windows
            .filter(Boolean)
            .map((window) => ({
              id: Number((window as MatWindow).id) || 0,
              name:
                typeof (window as MatWindow).name === 'string'
                  ? (window as MatWindow).name
                  : `Window ${Number((window as MatWindow).id) || 0}`,
              x: Number((window as MatWindow).x) || 0,
              y: Number((window as MatWindow).y) || 0,
              width: Number((window as MatWindow).width) || MIN_SIZE,
              height: Number((window as MatWindow).height) || MIN_SIZE
            }))
        : [];

      return {
        matWidth: sanitizeDimension(parsed.matWidth, matWidth),
        matHeight: sanitizeDimension(parsed.matHeight, matHeight),
        unit: typeof parsed.unit === 'string' ? parsed.unit : unit,
        windows: sanitizedWindows,
        selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds.map(Number) : [],
        idCounter: typeof parsed.idCounter === 'number' ? parsed.idCounter : 0
      };
    } catch (error) {
      console.warn('Failed to load mat designer state', error);
      return null;
    }
  }

  function persistState(state: MatDesignerState) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist mat designer state', error);
    }
  }

  const MIN_OVERLAP_PX = 4;

  const getHorizontalCenter = (view: PositionedWindow) =>
    clampValue(view.scaledY + view.scaledHeight / 2, DIMENSION_SAFE_PADDING, Math.max(scaledMatHeight - DIMENSION_SAFE_PADDING, 0));

  const getVerticalCenter = (view: PositionedWindow) =>
    clampValue(view.scaledX + view.scaledWidth / 2, DIMENSION_SAFE_PADDING, Math.max(scaledMatWidth - DIMENSION_SAFE_PADDING, 0));

  function verticalOverlap(a: PositionedWindow, b: PositionedWindow) {
    const top = Math.max(a.scaledY, b.scaledY);
    const bottom = Math.min(a.scaledY + a.scaledHeight, b.scaledY + b.scaledHeight);
    return bottom - top;
  }

  function horizontalOverlap(a: PositionedWindow, b: PositionedWindow) {
    const left = Math.max(a.scaledX, b.scaledX);
    const right = Math.min(a.scaledX + a.scaledWidth, b.scaledX + b.scaledWidth);
    return right - left;
  }

  function snapshot(): MatDesignerState {
    return {
      matWidth,
      matHeight,
      unit,
      windows: cloneWindows(windows),
      selectedIds: [...selectedIds],
      idCounter
    };
  }

  function applyState(state: MatDesignerState) {
    matWidth = state.matWidth;
    matHeight = state.matHeight;
    unit = state.unit;
    windows = cloneWindows(state.windows);
    selectedIds = [...state.selectedIds];
    idCounter =
      state.idCounter ?? Math.max(0, ...windows.map((window) => window.id));
  }

  function arraysEqual<T>(a: T[], b: T[]) {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return false;
    }
    return true;
  }

  function windowsEqual(a: MatWindow[], b: MatWindow[]) {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      const windowA = a[index];
      const windowB = b[index];
      if (
        windowA.id !== windowB.id ||
        windowA.name !== windowB.name ||
        windowA.x !== windowB.x ||
        windowA.y !== windowB.y ||
        windowA.width !== windowB.width ||
        windowA.height !== windowB.height
      ) {
        return false;
      }
    }
    return true;
  }

  function statesEqual(a: MatDesignerState, b: MatDesignerState) {
    return (
      a.matWidth === b.matWidth &&
      a.matHeight === b.matHeight &&
      a.unit === b.unit &&
      a.idCounter === b.idCounter &&
      windowsEqual(a.windows, b.windows) &&
      arraysEqual(a.selectedIds, b.selectedIds)
    );
  }

  function mutate(updater: () => void) {
    const before = snapshot();
    updater();
    const after = snapshot();
    if (!statesEqual(before, after)) {
      past = [...past, before];
      if (past.length > HISTORY_LIMIT) {
        past = past.slice(-HISTORY_LIMIT);
      }
      future = [];
      if (storageReady) {
        persistState(after);
      }
    }
  }

  function clampWindow(window: MatWindow): MatWindow {
    const width = Math.min(Math.max(window.width, MIN_SIZE), matWidth);
    const height = Math.min(Math.max(window.height, MIN_SIZE), matHeight);
    const x = Math.min(Math.max(window.x, 0), matWidth - width);
    const y = Math.min(Math.max(window.y, 0), matHeight - height);
    return { ...window, width, height, x, y };
  }

  function isSelected(id: number) {
    return selectedIds.includes(id);
  }

  function addWindow() {
    const offset = 30 * (windows.length % 5);
    mutate(() => {
      const newWindow = clampWindow(
        createWindow({ x: 60 + offset, y: 60 + offset, width: 140, height: 160 })
      );
      windows = [...windows, newWindow];
      selectedIds = [newWindow.id];
    });
  }

  function removeSelected() {
    const selectedSet = new Set(selectedIds);
    if (!selectedSet.size) return;
    mutate(() => {
      windows = windows.filter((window) => !selectedSet.has(window.id));
      if (windows.length) {
        selectedIds = [windows[windows.length - 1].id];
      } else {
        selectedIds = [];
      }
    });
  }

  function updateWindow(id: number, key: EditableWindowKey, value: number | string) {
    mutate(() => {
      windows = windows.map((window) => {
        if (window.id !== id) return window;
        const updated: MatWindow = { ...window };
        if (key === "name") {
          updated.name = String(value).trim() || window.name;
        } else {
          const numeric = Number(value);
          if (Number.isNaN(numeric)) return window;
          if (key === "x") updated.x = numeric;
          if (key === "y") updated.y = numeric;
          if (key === "width") updated.width = numeric;
          if (key === "height") updated.height = numeric;
        }
        return clampWindow(updated);
      });
    });
  }

  function toggleSelection(id: number, additive = false) {
    const currentSelection = [...selectedIds];
    mutate(() => {
      if (!additive) {
        selectedIds = [id];
        return;
      }
      const alreadySelected = currentSelection.includes(id);
      selectedIds = alreadySelected
        ? currentSelection.filter((existing) => existing !== id)
        : [...currentSelection, id];
    });
  }

  function clearSelection() {
    mutate(() => {
      selectedIds = [];
    });
  }

  function alignSelected(edge: "left" | "right" | "top" | "bottom") {
    const selectedSet = new Set(selectedIds);
    const selectedWindows = windows.filter((window) => selectedSet.has(window.id));
    if (selectedWindows.length < 2) return;

    let reference = 0;
    if (edge === "left") reference = Math.min(...selectedWindows.map((window) => window.x));
    if (edge === "right") {
      reference = Math.max(...selectedWindows.map((window) => window.x + window.width));
    }
    if (edge === "top") reference = Math.min(...selectedWindows.map((window) => window.y));
    if (edge === "bottom") {
      reference = Math.max(...selectedWindows.map((window) => window.y + window.height));
    }

    mutate(() => {
      windows = windows.map((window) => {
        if (!selectedSet.has(window.id)) return window;
        const updated = { ...window };
        if (edge === "left") updated.x = reference;
        if (edge === "right") updated.x = reference - updated.width;
        if (edge === "top") updated.y = reference;
        if (edge === "bottom") updated.y = reference - updated.height;
        return clampWindow(updated);
      });
    });
  }

  function centerSelected(axis: "horizontal" | "vertical") {
    const selectedSet = new Set(selectedIds);
    if (!selectedSet.size) return;
    mutate(() => {
      windows = windows.map((window) => {
        if (!selectedSet.has(window.id)) return window;
        const updated = { ...window };
        if (axis === "horizontal") updated.x = (matWidth - window.width) / 2;
        if (axis === "vertical") updated.y = (matHeight - window.height) / 2;
        return clampWindow(updated);
      });
    });
  }

  function distribute(direction: "horizontal" | "vertical") {
    const selectedSet = new Set(selectedIds);
    const targets = windows
      .filter((window) => selectedSet.has(window.id))
      .sort((a, b) => (direction === "horizontal" ? a.x - b.x : a.y - b.y));

    if (targets.length < 2) return;

    const totalSpan = direction === "horizontal" ? matWidth : matHeight;
    const usedSpace = targets.reduce(
      (sum, window) => sum + (direction === "horizontal" ? window.width : window.height),
      0
    );
    const gap = Math.max((totalSpan - usedSpace) / (targets.length + 1), 0);

    mutate(() => {
      let cursor = gap;
      const updates = new Map<number, MatWindow>();
      targets.forEach((window) => {
        const updated = { ...window };
        if (direction === "horizontal") {
          updated.x = cursor;
          cursor += window.width + gap;
        } else {
          updated.y = cursor;
          cursor += window.height + gap;
        }
        updates.set(window.id, clampWindow(updated));
      });
      windows = windows.map((window) => updates.get(window.id) ?? window);
    });
  }

  function handleMatWidthChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const sanitized = sanitizeDimension(input.valueAsNumber, matWidth);
    mutate(() => {
      matWidth = sanitized;
      windows = windows.map((window) => clampWindow(window));
    });
  }

  function handleMatHeightChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const sanitized = sanitizeDimension(input.valueAsNumber, matHeight);
    mutate(() => {
      matHeight = sanitized;
      windows = windows.map((window) => clampWindow(window));
    });
  }

  function handleUnitChange(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const nextUnit = select.value;
    if (nextUnit === unit) return;
    mutate(() => {
      unit = nextUnit;
    });
  }

  function handleKeyActivate(event: KeyboardEvent, callback: (event: KeyboardEvent) => void) {
    const key = event.key;
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      event.stopPropagation();
      callback(event);
    }
  }

  function printLayout() {
    if (typeof window === "undefined") return;
    window.print();
  }

  function undo() {
    if (!past.length) return;
    const previous = past[past.length - 1];
    past = past.slice(0, -1);
    const current = snapshot();
    future = [...future, current];
    if (future.length > HISTORY_LIMIT) {
      future = future.slice(-HISTORY_LIMIT);
    }
    applyState(previous);
  }

  function redo() {
    if (!future.length) return;
    const next = future[future.length - 1];
    future = future.slice(0, -1);
    const current = snapshot();
    past = [...past, current];
    if (past.length > HISTORY_LIMIT) {
      past = past.slice(-HISTORY_LIMIT);
    }
    applyState(next);
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const restored = loadPersistedState();
      if (restored) {
        matWidth = restored.matWidth;
        matHeight = restored.matHeight;
        unit = restored.unit;
        windows = restored.windows.map((window) => clampWindow({ ...window }));
        const windowIds = new Set(windows.map((window) => window.id));
        selectedIds = restored.selectedIds.filter((id) => windowIds.has(id));
        if (!selectedIds.length && windows.length) {
          selectedIds = [windows[0].id];
        }
        idCounter = Math.max(
          restored.idCounter ?? 0,
          ...windows.map((window) => window.id)
        );
        past = [];
        future = [];
      }
      storageReady = true;
      persistState(snapshot());
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  $: availablePreviewWidth = Math.max(
    MIN_PREVIEW_CONTAINER_WIDTH,
    previewContainerWidth - MAT_CONTAINER_PADDING
  );

  $: previewScale = Math.max(
    Math.min(
      PREVIEW_MAX_WIDTH / matWidth,
      PREVIEW_MAX_HEIGHT / matHeight,
      availablePreviewWidth / matWidth,
      2
    ),
    MIN_PREVIEW_SCALE
  );
  $: scaledMatWidth = matWidth * previewScale;
  $: scaledMatHeight = matHeight * previewScale;
  $: positionedWindows = windows.map((window): PositionedWindow => {
    const scaledWidth = window.width * previewScale;
    const scaledHeight = window.height * previewScale;
    const scaledX = window.x * previewScale;
    const scaledY = window.y * previewScale;

    const horizontalAbove = scaledY > DIMENSION_LABEL_MARGIN * 2;
    const horizontalTop = clampValue(
      horizontalAbove
        ? scaledY - DIMENSION_LABEL_MARGIN
        : scaledY + scaledHeight + DIMENSION_SAFE_PADDING,
      0,
      Math.max(scaledMatHeight - DIMENSION_SAFE_PADDING, 0)
    );

    const verticalLeftAvailable = scaledX > DIMENSION_LABEL_MARGIN * 2;
    const verticalLeft = clampValue(
      verticalLeftAvailable
        ? scaledX - DIMENSION_LABEL_MARGIN
        : scaledX + scaledWidth + DIMENSION_SAFE_PADDING,
      0,
      Math.max(scaledMatWidth - DIMENSION_SAFE_PADDING, 0)
    );

    return {
      ...window,
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight,
      horizontal: {
        left: scaledX,
        top: horizontalTop,
        length: Math.max(scaledWidth, 0),
        position: horizontalAbove ? "above" : "below"
      },
      vertical: {
        top: scaledY,
        left: verticalLeft,
        length: Math.max(scaledHeight, 0),
        position: verticalLeftAvailable ? "left" : "right"
      }
    };
  });

  $: matDimensions = {
    horizontal: {
      left: 0,
      top: clampValue(
        scaledMatHeight - (DIMENSION_LABEL_MARGIN + DIMENSION_SAFE_PADDING),
        0,
        Math.max(scaledMatHeight - DIMENSION_SAFE_PADDING, 0)
      ),
      length: scaledMatWidth
    },
    vertical: {
      top: 0,
      left: clampValue(
        scaledMatWidth - (DIMENSION_LABEL_MARGIN + DIMENSION_SAFE_PADDING),
        0,
        Math.max(scaledMatWidth - DIMENSION_SAFE_PADDING, 0)
      ),
      length: scaledMatHeight
    }
  };

  $: marginDimensions = positionedWindows.flatMap((view) => {
    const dims: ExtraDimension[] = [];

    const horizontalCenter = getHorizontalCenter(view);
    const verticalCenter = getVerticalCenter(view);

    if (view.scaledX > 1) {
      dims.push({
        id: `margin-left-${view.id}`,
        orientation: 'horizontal',
        left: 0,
        top: horizontalCenter,
        length: view.scaledX,
        label: formatMeasurement(view.x),
        modifier: 'margin'
      });
    }

    const rightSpace = matWidth - (view.x + view.width);
    const rightScaled = scaledMatWidth - (view.scaledX + view.scaledWidth);
    if (rightScaled > 1) {
      dims.push({
        id: `margin-right-${view.id}`,
        orientation: 'horizontal',
        left: view.scaledX + view.scaledWidth,
        top: horizontalCenter,
        length: rightScaled,
        label: formatMeasurement(rightSpace),
        modifier: 'margin'
      });
    }

    if (view.scaledY > 1) {
      dims.push({
        id: `margin-top-${view.id}`,
        orientation: 'vertical',
        left: verticalCenter,
        top: 0,
        length: view.scaledY,
        label: formatMeasurement(view.y),
        modifier: 'margin'
      });
    }

    const bottomSpace = matHeight - (view.y + view.height);
    const bottomScaled = scaledMatHeight - (view.scaledY + view.scaledHeight);
    if (bottomScaled > 1) {
      dims.push({
        id: `margin-bottom-${view.id}`,
        orientation: 'vertical',
        left: verticalCenter,
        top: view.scaledY + view.scaledHeight,
        length: bottomScaled,
        label: formatMeasurement(bottomSpace),
        modifier: 'margin'
      });
    }

    return dims.filter((dim) => dim.length > 1);
  });

  $: spacingDimensions = (() => {
    const dims: ExtraDimension[] = [];

    const sortedByX = [...positionedWindows].sort((a, b) => a.scaledX - b.scaledX);
    sortedByX.forEach((view) => {
      const neighbor = sortedByX
        .filter((other) => other.scaledX > view.scaledX && verticalOverlap(view, other) > MIN_OVERLAP_PX)
        .sort((a, b) => a.scaledX - b.scaledX)[0];
      if (neighbor) {
        const gap = neighbor.scaledX - (view.scaledX + view.scaledWidth);
        if (gap > 1) {
          const overlapTop = Math.max(view.scaledY, neighbor.scaledY);
          const overlapBottom = Math.min(view.scaledY + view.scaledHeight, neighbor.scaledY + neighbor.scaledHeight);
          const centerY = clampValue(overlapTop + (overlapBottom - overlapTop) / 2, DIMENSION_SAFE_PADDING, Math.max(scaledMatHeight - DIMENSION_SAFE_PADDING, 0));
          dims.push({
            id: `spacing-h-${view.id}-${neighbor.id}`,
            orientation: 'horizontal',
            left: view.scaledX + view.scaledWidth,
            top: centerY,
            length: gap,
            label: formatMeasurement(neighbor.x - (view.x + view.width)),
            modifier: 'spacing'
          });
        }
      }
    });

    const sortedByY = [...positionedWindows].sort((a, b) => a.scaledY - b.scaledY);
    sortedByY.forEach((view) => {
      const neighbor = sortedByY
        .filter((other) => other.scaledY > view.scaledY && horizontalOverlap(view, other) > MIN_OVERLAP_PX)
        .sort((a, b) => a.scaledY - b.scaledY)[0];
      if (neighbor) {
        const gap = neighbor.scaledY - (view.scaledY + view.scaledHeight);
        if (gap > 1) {
          const overlapLeft = Math.max(view.scaledX, neighbor.scaledX);
          const overlapRight = Math.min(view.scaledX + view.scaledWidth, neighbor.scaledX + neighbor.scaledWidth);
          const centerX = clampValue(overlapLeft + (overlapRight - overlapLeft) / 2, DIMENSION_SAFE_PADDING, Math.max(scaledMatWidth - DIMENSION_SAFE_PADDING, 0));
          dims.push({
            id: `spacing-v-${view.id}-${neighbor.id}`,
            orientation: 'vertical',
            left: centerX,
            top: view.scaledY + view.scaledHeight,
            length: gap,
            label: formatMeasurement(neighbor.y - (view.y + view.height)),
            modifier: 'spacing'
          });
        }
      }
    });

    return dims;
  })();

  $: extraDimensions = [...marginDimensions, ...spacingDimensions];

  $: selectedCount = selectedIds.length;
  $: canUndo = past.length > 0;
  $: canRedo = future.length > 0;
</script>

<section class="designer">
  <header>
    <div class="header-row">
      <h1>Mat Designer</h1>
      <div class="history-actions">
        <button
          type="button"
          class="secondary"
          on:click={undo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          class="secondary"
          on:click={redo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z)"
        >
          Redo
        </button>
        <button
          type="button"
          class="secondary print-action"
          on:click={printLayout}
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
          min={MIN_SIZE}
          value={matWidth}
          on:change={handleMatWidthChange}
        />
      </label>
      <label>
        Mat Height ({unit})
        <input
          type="number"
          min={MIN_SIZE}
          value={matHeight}
          on:change={handleMatHeightChange}
        />
      </label>
      <label>
        Units
        <select value={unit} on:change={handleUnitChange}>
          {#each unitOptions as option}
            <option value={option} selected={option === unit}>{option}</option>
          {/each}
        </select>
      </label>
      <span class="scale">Preview scale: {(previewScale * 100).toFixed(0)}%</span>
    </div>
  </header>

  <div class="layout">
    <div class="controls">
      <div class="control-group">
        <h2>Windows</h2>
        <div class="actions">
          <button type="button" on:click={addWindow}>Add Window</button>
          <button type="button" on:click={removeSelected} disabled={!selectedCount}>
            Remove Selected
          </button>
        </div>
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
                class:selected={isSelected(window.id)}
                on:click={(event) => toggleSelection(window.id, altKey(event))}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected(window.id)}
                    on:click|stopPropagation
                    on:change={() => toggleSelection(window.id, true)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={window.name}
                    on:click|stopPropagation
                    on:change={(event) =>
                      updateWindow(window.id, "name", event.currentTarget.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={window.x}
                    min="0"
                    on:click|stopPropagation
                    on:change={(event) =>
                      updateWindow(window.id, "x", event.currentTarget.valueAsNumber)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={window.y}
                    min="0"
                    on:click|stopPropagation
                    on:change={(event) =>
                      updateWindow(window.id, "y", event.currentTarget.valueAsNumber)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={window.width}
                    min={MIN_SIZE}
                    on:click|stopPropagation
                    on:change={(event) =>
                      updateWindow(window.id, "width", event.currentTarget.valueAsNumber)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={window.height}
                    min={MIN_SIZE}
                    on:click|stopPropagation
                    on:change={(event) =>
                      updateWindow(window.id, "height", event.currentTarget.valueAsNumber)}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="control-group">
        <h2>Arrange</h2>
        <div class="buttons-grid">
          <button type="button" on:click={() => alignSelected("left")} disabled={selectedCount < 2}>
            Align Left
          </button>
          <button type="button" on:click={() => alignSelected("right")} disabled={selectedCount < 2}>
            Align Right
          </button>
          <button type="button" on:click={() => alignSelected("top")} disabled={selectedCount < 2}>
            Align Top
          </button>
          <button type="button" on:click={() => alignSelected("bottom")} disabled={selectedCount < 2}>
            Align Bottom
          </button>
          <button type="button" on:click={() => centerSelected("horizontal")} disabled={!selectedCount}>
            Center Horizontally
          </button>
          <button type="button" on:click={() => centerSelected("vertical")} disabled={!selectedCount}>
            Center Vertically
          </button>
          <button type="button" on:click={() => distribute("horizontal")} disabled={selectedCount < 2}>
            Distribute Across Mat (Horizontal)
          </button>
          <button type="button" on:click={() => distribute("vertical")} disabled={selectedCount < 2}>
            Distribute Across Mat (Vertical)
          </button>
        </div>
      </div>
    </div>
    <div class="preview-wrapper">
      <h2>Preview</h2>
      <div class="mat-container" bind:clientWidth={previewContainerWidth}>
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
              aria-pressed={isSelected(view.id)}
              aria-label={`${view.name} (${Math.round(view.width)} by ${Math.round(view.height)} ${unit})`}
              class:selected={isSelected(view.id)}
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
              class:above={view.horizontal.position === "above"}
              class:below={view.horizontal.position === "below"}
              style={`left: ${view.horizontal.left}px; top: ${view.horizontal.top}px; width: ${view.horizontal.length}px;`}
            >
              <span>{formatMeasurement(view.width)}</span>
            </div>
            <div
              class="dimension vertical"
              class:left={view.vertical.position === "left"}
              class:right={view.vertical.position === "right"}
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
  </div>
</section>

<style>

  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background: #f4f4f5;
    color: #1f2937;
  }

  .designer {
    max-width: 1120px;
    margin: 0 auto;
    padding: 2rem;
    flex-direction: column;
    gap: 1.5rem;
  }

  header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-row {
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  header h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .history-actions {
    gap: 0.5rem;
    align-items: center;
  }

  .mat-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: end;
  }

  label {
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  input,
  select,
  button {
    font: inherit;
  }

  input[type='number'],
  input[type='text'],
  select {
    padding: 0.5rem 0.65rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: #fff;
  }

  input[type='number']:focus,
  input[type='text']:focus,
  select:focus {
    outline: 2px solid #4f46e5;
    outline-offset: 1px;
  }

  button {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: #4f46e5;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  button:not(:disabled):hover {
    background: #4338ca;
  }

  button.secondary {
    background: #e5e7eb;
    color: #1f2937;
  }

  button.secondary:disabled {
    background: #e5e7eb;
    color: #9ca3af;
  }

  button.secondary:not(:disabled):hover {
    background: #d1d5db;
  }

  .layout {
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: stretch;
  }

  .controls {
    flex-direction: column;
    gap: 1.5rem;
    flex: 1 1 520px;
    min-width: 360px;
  }

  .control-group {
    padding: 1.25rem;
    background: #fff;
    border-radius: 1rem;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
    flex-direction: column;
    gap: 1rem;
  }

  .control-group h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .actions {
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    table-layout: fixed;
  }

  th,
  td {
    padding: 0.45rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    word-break: break-word;
  }

  tr.selected {
    background: rgba(79, 70, 229, 0.1);
  }

  .buttons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .preview-wrapper {
    flex-direction: column;
    gap: 1rem;
    flex: 1 1 360px;
    min-width: 320px;
    max-width: 720px;
  }

  .mat-container {
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
    border: 1px solid rgba(17, 24, 39, 0.18);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
  }

  .dimension.horizontal {
    height: 1px;
  }

  .dimension.horizontal::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    border-top: 1px solid rgba(17, 24, 39, 0.55);
  }

  .dimension.horizontal span {
    position: absolute;
    left: 50%;
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

  .scale {
    font-size: 0.85rem;
    color: #6b7280;
    font-weight: 500;
  }

  @media (max-width: 1024px) {
    .layout {
      flex-direction: column;
    }

    .controls,
    .preview-wrapper {
      max-width: none;
    }
  }
  @media print {
    :global(body) {
      background: #fff;
      color: #000;
    }

    header,
    .controls,
    .history-actions,
    .clear-selection {
      display: none !important;
    }

    .designer {
      padding: 0;
      max-width: none;
    }

    .layout {
      display: block;
    }

    .preview-wrapper {
      max-width: none;
    }

    .mat-container {
      overflow: visible !important;
      padding: 0;
    }

    .mat {
      box-shadow: none;
    }
  }
</style>








