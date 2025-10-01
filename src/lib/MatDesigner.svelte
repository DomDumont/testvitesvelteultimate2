<script lang="ts">
  import { onMount } from 'svelte';
  import MatDesignerHeader from './mat-designer/MatDesignerHeader.svelte';
  import WindowTable from './mat-designer/WindowTable.svelte';
  import ArrangeControls from './mat-designer/ArrangeControls.svelte';
  import MatPreviewPanel from './mat-designer/MatPreviewPanel.svelte';
  import type {
    MatWindow,
    EditableWindowKey,
    MatDesignerState,
    PositionedWindow,
    MatDimensionOverlay,
    ExtraDimension,
    Unit,
    MatPreset
  } from './mat-designer/types';

  const MIN_SIZE_MM = 20;
  const PREVIEW_MAX_WIDTH = 600;
  const PREVIEW_MAX_HEIGHT = 420;
  const HISTORY_LIMIT = 100;

  const MIN_PREVIEW_CONTAINER_WIDTH = 320;
  const MIN_PREVIEW_SCALE = 0.2;
  const MAT_CONTAINER_PADDING = 16;

  const DIMENSION_LABEL_MARGIN = 18;
  const DIMENSION_SAFE_PADDING = 12;

  const STORAGE_KEY = 'mat-designer-state/v1';
  const PRESETS_STORAGE_KEY = 'mat-designer-presets/v1';
  const DEFAULT_PRESET_PREFIX = 'default-';

  const unitOptions: Unit[] = ['mm', 'cm', 'in'];
  const UNIT_TO_MM: Record<Unit, number> = {
    mm: 1,
    cm: 10,
    in: 25.4
  };
  const ROUND_PRECISION = 1000;

  let matWidth = 500;
  let matHeight = 350;
  let unit: Unit = 'mm';
  let minSize = MIN_SIZE_MM;
  let unitScale = UNIT_TO_MM[unit];
  let matWidthMm = matWidth * unitScale;
  let matHeightMm = matHeight * unitScale;
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
  let selectedIdSet: Set<number> = new Set(selectedIds);

  let past: MatDesignerState[] = [];
  let future: MatDesignerState[] = [];

  let presets: MatPreset[] = [];
  let selectedPresetId: string | null = null;
  let activePresetId: string | null = null;
  let newPresetName = '';
  let canLoadPreset = false;
  let canDeletePreset = false;
  let canSavePreset = false;

  let previewContainerWidth = PREVIEW_MAX_WIDTH;

  let previewScale = 1;

  let extraDimensions: ExtraDimension[] = [];

  let marginDimensions: ExtraDimension[] = [];
  let spacingDimensions: ExtraDimension[] = [];

  let storageReady = false;
  let suppressPresetReset = false;

  let positionedWindows: PositionedWindow[] = [];
  let matDimensions: MatDimensionOverlay = {
    horizontal: { left: 0, top: 0, length: 0 },
    vertical: { left: 0, top: 0, length: 0 }
  };

  const altKey = (event: MouseEvent | KeyboardEvent) =>
    event.shiftKey || event.metaKey || event.ctrlKey;

  function sanitizeDimension(value: number, fallback: number, minimum = minSize) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(value, minimum);
  }

  function cloneWindows(list: MatWindow[]): MatWindow[] {
    return list.map((window) => ({ ...window }));
  }

  function cloneState(state: MatDesignerState): MatDesignerState {
    return {
      matWidth: state.matWidth,
      matHeight: state.matHeight,
      unit: state.unit,
      windows: cloneWindows(state.windows),
      selectedIds: [...state.selectedIds],
      idCounter: state.idCounter
    };
  }

  function clonePreset(preset: MatPreset): MatPreset {
    return {
      id: preset.id,
      name: preset.name,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      state: cloneState(preset.state)
    };
  }

  const DEFAULT_PRESETS = createDefaultPresets();

  function createDefaultPresets(): MatPreset[] {
    const classicPortrait: MatDesignerState = {
      matWidth: 280,
      matHeight: 356,
      unit: 'mm',
      windows: [
        {
          id: 1,
          name: 'Portrait Opening',
          x: 38.5,
          y: 51,
          width: 203,
          height: 254
        }
      ],
      selectedIds: [],
      idCounter: 1
    };

    const galleryDuo: MatDesignerState = {
      matWidth: 457,
      matHeight: 356,
      unit: 'mm',
      windows: [
        {
          id: 1,
          name: 'Left Opening',
          x: 70,
          y: 89,
          width: 127,
          height: 178
        },
        {
          id: 2,
          name: 'Right Opening',
          x: 260,
          y: 89,
          width: 127,
          height: 178
        }
      ],
      selectedIds: [],
      idCounter: 2
    };

    const panoramicTriptych: MatDesignerState = {
      matWidth: 635,
      matHeight: 305,
      unit: 'mm',
      windows: [
        {
          id: 1,
          name: 'Panel A',
          x: 52.5,
          y: 47.5,
          width: 150,
          height: 210
        },
        {
          id: 2,
          name: 'Panel B',
          x: 242.5,
          y: 47.5,
          width: 150,
          height: 210
        },
        {
          id: 3,
          name: 'Panel C',
          x: 432.5,
          y: 47.5,
          width: 150,
          height: 210
        }
      ],
      selectedIds: [],
      idCounter: 3
    };

    const titleBlockPortrait: MatDesignerState = {
      matWidth: 280,
      matHeight: 356,
      unit: 'mm',
      windows: [
        {
          id: 1,
          name: 'Artwork Opening',
          x: 38.5,
          y: 30,
          width: 203,
          height: 254
        },
        {
          id: 2,
          name: 'Title Window',
          x: 60,
          y: 304,
          width: 160,
          height: 40
        }
      ],
      selectedIds: [],
      idCounter: 2
    };

    const defaults: Array<{ id: string; name: string; state: MatDesignerState }> = [
      {
        id: `${DEFAULT_PRESET_PREFIX}classic-portrait`,
        name: 'Classic Portrait 8x10',
        state: classicPortrait
      },
      {
        id: `${DEFAULT_PRESET_PREFIX}gallery-duo`,
        name: 'Gallery Duo 5x7',
        state: galleryDuo
      },
      {
        id: `${DEFAULT_PRESET_PREFIX}panoramic-triptych`,
        name: 'Panoramic Triptych',
        state: panoramicTriptych
      },
      {
        id: `${DEFAULT_PRESET_PREFIX}title-block`,
        name: 'Museum Title Block',
        state: titleBlockPortrait
      }
    ];

    return defaults.map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      createdAt: index,
      updatedAt: index,
      state: cloneState(entry.state)
    }));
  }

  function isDefaultPreset(id: string | null | undefined): boolean {
    return Boolean(id && id.startsWith(DEFAULT_PRESET_PREFIX));
  }

  function buildPresetList(customPresets: MatPreset[]): MatPreset[] {
    const defaults = DEFAULT_PRESETS.map(clonePreset);
    const customs = customPresets
      .filter((preset) => !isDefaultPreset(preset.id))
      .map(clonePreset);

    const combined = [...defaults, ...customs];
    combined.sort((a, b) => {
      const aDefault = isDefaultPreset(a.id);
      const bDefault = isDefaultPreset(b.id);
      if (aDefault && !bDefault) return -1;
      if (!aDefault && bDefault) return 1;
      return a.name.localeCompare(b.name);
    });
    return combined;
  }

  const clampValue = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
    Math.min(Math.max(value, min), max);

  function roundMeasurement(value: number) {
    return Math.round(value * ROUND_PRECISION) / ROUND_PRECISION;
  }

  function convertMeasurement(value: number, from: Unit, to: Unit) {
    if (from === to) return value;
    const millimetres = value * UNIT_TO_MM[from];
    return roundMeasurement(millimetres / UNIT_TO_MM[to]);
  }

  function isUnit(value: string): value is Unit {
    return value === 'mm' || value === 'cm' || value === 'in';
  }

  $: minSize = convertMeasurement(MIN_SIZE_MM, 'mm', unit);
  $: unitScale = UNIT_TO_MM[unit];
  $: matWidthMm = matWidth * unitScale;
  $: matHeightMm = matHeight * unitScale;

  function formatMeasurement(length: number) {
    const rounded = roundMeasurement(length);
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

      const persistedUnit: Unit =
        typeof parsed.unit === 'string' && isUnit(parsed.unit) ? parsed.unit : unit;
      const minForPersistedUnit = convertMeasurement(MIN_SIZE_MM, 'mm', persistedUnit);
      const fallbackWidth = convertMeasurement(matWidth, unit, persistedUnit);
      const fallbackHeight = convertMeasurement(matHeight, unit, persistedUnit);

      const sanitizedWindows = Array.isArray(parsed.windows)
        ? parsed.windows
            .filter(Boolean)
            .map((window) => {
              const candidate = window as MatWindow;
              const width = Number(candidate.width);
              const height = Number(candidate.height);
              return {
                id: Number(candidate.id) || 0,
                name:
                  typeof candidate.name === 'string'
                    ? candidate.name
                    : `Window ${Number(candidate.id) || 0}`,
                x: Number(candidate.x) || 0,
                y: Number(candidate.y) || 0,
                width: sanitizeDimension(width, minForPersistedUnit, minForPersistedUnit),
                height: sanitizeDimension(height, minForPersistedUnit, minForPersistedUnit)
              };
            })
        : [];

      return {
        matWidth: sanitizeDimension(parsed.matWidth, fallbackWidth, minForPersistedUnit),
        matHeight: sanitizeDimension(parsed.matHeight, fallbackHeight, minForPersistedUnit),
        unit: persistedUnit,
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

  function loadPresetStore(): MatPreset[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const sanitized = parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const preset = entry as Partial<MatPreset>;
          if (typeof preset.id !== 'string' || !preset.id) return null;
          if (typeof preset.name !== 'string' || !preset.name.trim()) return null;
          if (typeof preset.createdAt !== 'number' || typeof preset.updatedAt !== 'number') return null;
          const state = preset.state as Partial<MatDesignerState> | undefined;
          if (!state) return null;
          if (
            typeof state.matWidth !== 'number' ||
            typeof state.matHeight !== 'number' ||
            typeof state.unit !== 'string' ||
            !isUnit(state.unit) ||
            !Array.isArray(state.windows)
          ) {
            return null;
          }

          const sanitizedWindows = state.windows
            .filter(Boolean)
            .map((window) => {
              const candidate = window as MatWindow;
              return {
                id: Number(candidate.id) || 0,
                name:
                  typeof candidate.name === 'string'
                    ? candidate.name
                    : `Window ${Number(candidate.id) || 0}`,
                x: Number(candidate.x) || 0,
                y: Number(candidate.y) || 0,
                width: Number(candidate.width) || MIN_SIZE_MM,
                height: Number(candidate.height) || MIN_SIZE_MM
              };
            });

          return {
            id: preset.id,
            name: preset.name.trim(),
            createdAt: preset.createdAt,
            updatedAt: preset.updatedAt,
            state: {
              matWidth: state.matWidth,
              matHeight: state.matHeight,
              unit: state.unit,
              windows: sanitizedWindows,
              selectedIds: Array.isArray(state.selectedIds)
                ? state.selectedIds.map(Number).filter((id) => Number.isFinite(id))
                : [],
              idCounter: typeof state.idCounter === 'number' ? state.idCounter : 0
            }
          } satisfies MatPreset;
        })
        .filter((value): value is MatPreset => Boolean(value));

      return sanitized
        .filter((preset) => !isDefaultPreset(preset.id))
        .map((preset) => clonePreset(preset));
    } catch (error) {
      console.warn('Failed to load mat designer presets', error);
      return [];
    }
  }

  function persistPresets(list: MatPreset[]) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      console.warn('Failed to persist mat designer presets', error);
    }
  }

  function handlePresetSelect(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const value = select.value;
    selectedPresetId = value || null;
    if (!selectedPresetId) {
      newPresetName = '';
      return;
    }
    const preset = presets.find((entry) => entry.id === selectedPresetId);
    newPresetName = preset ? preset.name : '';
  }

  function loadSelectedPreset() {
    if (!selectedPresetId) return;
    const preset = presets.find((entry) => entry.id === selectedPresetId);
    if (!preset) return;
    suppressPresetReset = true;
    applyState({
      matWidth: preset.state.matWidth,
      matHeight: preset.state.matHeight,
      unit: preset.state.unit,
      windows: cloneWindows(preset.state.windows),
      selectedIds: [...preset.state.selectedIds],
      idCounter: preset.state.idCounter
    });
    windows = windows.map((window) => clampWindow(window));
    past = [];
    future = [];
    suppressPresetReset = false;
    activePresetId = preset.id;
    newPresetName = preset.name;
    if (storageReady) {
      persistState(snapshot());
    }
  }

  function deleteSelectedPreset() {
    if (!selectedPresetId || isDefaultPreset(selectedPresetId)) return;

    const existingCustomPresets = presets
      .filter((preset) => !isDefaultPreset(preset.id))
      .map(clonePreset);

    const nextCustomPresets = existingCustomPresets.filter((preset) => preset.id !== selectedPresetId);
    if (nextCustomPresets.length === existingCustomPresets.length) return;

    persistPresets(nextCustomPresets);
    presets = buildPresetList(nextCustomPresets);

    if (activePresetId === selectedPresetId) {
      activePresetId = null;
    }

    const nextSelection = presets.find((preset) => !isDefaultPreset(preset.id)) ?? presets[0] ?? null;
    selectedPresetId = nextSelection ? nextSelection.id : null;
    newPresetName = nextSelection ? nextSelection.name : '';
  }

  function savePreset() {
    const trimmedName = newPresetName.trim();
    if (!trimmedName) return;
    const now = Date.now();
    const currentSnapshot = snapshot();

    const customPresets = presets
      .filter((preset) => !isDefaultPreset(preset.id))
      .map(clonePreset);

    const existingIndex = selectedPresetId
      ? customPresets.findIndex((preset) => preset.id === selectedPresetId)
      : -1;
    const byNameIndex = customPresets.findIndex(
      (preset) => preset.name.toLowerCase() === trimmedName.toLowerCase()
    );

    let targetId: string;
    if (existingIndex >= 0) {
      const target = customPresets[existingIndex];
      customPresets[existingIndex] = {
        ...target,
        name: trimmedName,
        updatedAt: now,
        state: currentSnapshot
      };
      targetId = customPresets[existingIndex].id;
    } else if (byNameIndex >= 0) {
      const target = customPresets[byNameIndex];
      customPresets[byNameIndex] = {
        ...target,
        name: trimmedName,
        updatedAt: now,
        state: currentSnapshot
      };
      targetId = customPresets[byNameIndex].id;
    } else {
      const newPreset: MatPreset = {
        id: `preset-${now}`,
        name: trimmedName,
        createdAt: now,
        updatedAt: now,
        state: currentSnapshot
      };
      customPresets.push(newPreset);
      targetId = newPreset.id;
    }

    persistPresets(customPresets);
    presets = buildPresetList(customPresets);

    const activePreset = presets.find((preset) => preset.id === targetId) ?? presets[0] ?? null;
    selectedPresetId = activePreset ? activePreset.id : null;
    newPresetName = activePreset ? activePreset.name : '';
    activePresetId = activePreset ? activePreset.id : null;
  }

  function handlePresetNameInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    newPresetName = input.value;
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
      if (!suppressPresetReset) {
        activePresetId = null;
      }
    }
  }

  function clampWindow(
    window: MatWindow,
    limits: { matWidth?: number; matHeight?: number; minSize?: number } = {}
  ): MatWindow {
    const limitWidth = limits.matWidth ?? matWidth;
    const limitHeight = limits.matHeight ?? matHeight;
    const minimum = limits.minSize ?? minSize;
    const width = Math.min(Math.max(window.width, minimum), limitWidth);
    const height = Math.min(Math.max(window.height, minimum), limitHeight);
    const x = Math.min(Math.max(window.x, 0), Math.max(limitWidth - width, 0));
    const y = Math.min(Math.max(window.y, 0), Math.max(limitHeight - height, 0));
    return { ...window, width, height, x, y };
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

  function alignSelected(
    alignment:
      | "left"
      | "right"
      | "top"
      | "bottom"
      | "horizontal-center"
      | "vertical-center"
  ) {
    if (selectedIds.length < 2) return;

    const anchorId = selectedIds[selectedIds.length - 1];
    const anchorWindow = windows.find((window) => window.id === anchorId);
    if (!anchorWindow) return;

    const selectedSet = new Set(selectedIds);

    let reference = 0;
    if (alignment === "left") reference = anchorWindow.x;
    if (alignment === "right") reference = anchorWindow.x + anchorWindow.width;
    if (alignment === "top") reference = anchorWindow.y;
    if (alignment === "bottom") reference = anchorWindow.y + anchorWindow.height;
    if (alignment === "horizontal-center") {
      reference = anchorWindow.x + anchorWindow.width / 2;
    }
    if (alignment === "vertical-center") {
      reference = anchorWindow.y + anchorWindow.height / 2;
    }

    mutate(() => {
      windows = windows.map((window) => {
        if (!selectedSet.has(window.id)) return window;
        const updated = { ...window };
        if (alignment === "left") updated.x = reference;
        if (alignment === "right") updated.x = reference - updated.width;
        if (alignment === "top") updated.y = reference;
        if (alignment === "bottom") updated.y = reference - updated.height;
        if (alignment === "horizontal-center") updated.x = reference - updated.width / 2;
        if (alignment === "vertical-center") updated.y = reference - updated.height / 2;
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
    const nextUnitValue = select.value;
    if (!isUnit(nextUnitValue)) return;
    if (nextUnitValue === unit) return;
    mutate(() => {
      const fromUnit = unit;
      const nextMinSize = convertMeasurement(MIN_SIZE_MM, 'mm', nextUnitValue);
      const convert = (value: number) => convertMeasurement(value, fromUnit, nextUnitValue);
      const convertedWidth = convert(matWidth);
      const convertedHeight = convert(matHeight);
      const convertedWindows = windows.map((window) => ({
        ...window,
        x: convert(window.x),
        y: convert(window.y),
        width: convert(window.width),
        height: convert(window.height)
      }));

      unit = nextUnitValue;
      matWidth = convertedWidth;
      matHeight = convertedHeight;
      windows = convertedWindows.map((window) =>
        clampWindow(window, {
          matWidth: convertedWidth,
          matHeight: convertedHeight,
          minSize: nextMinSize
        })
      );
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
      const customPresets = loadPresetStore();
      presets = buildPresetList(customPresets);
      const initialPreset = presets[0] ?? null;
      selectedPresetId = initialPreset ? initialPreset.id : null;
      newPresetName = initialPreset ? initialPreset.name : '';
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

  $: previewScale = (() => {
    const safeWidth = Math.max(matWidthMm, MIN_SIZE_MM);
    const safeHeight = Math.max(matHeightMm, MIN_SIZE_MM);
    const maxScale = Math.min(
      PREVIEW_MAX_WIDTH / safeWidth,
      PREVIEW_MAX_HEIGHT / safeHeight,
      availablePreviewWidth / safeWidth,
      2
    );
    return Math.max(maxScale, MIN_PREVIEW_SCALE);
  })();
  $: scaledMatWidth = matWidthMm * previewScale;
  $: scaledMatHeight = matHeightMm * previewScale;
  $: positionedWindows = windows.map((window): PositionedWindow => {
    const scaledWidth = window.width * unitScale * previewScale;
    const scaledHeight = window.height * unitScale * previewScale;
    const scaledX = window.x * unitScale * previewScale;
    const scaledY = window.y * unitScale * previewScale;

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

  $: selectedIdSet = new Set(selectedIds);

  $: selectedCount = selectedIds.length;
  $: canUndo = past.length > 0;
  $: canRedo = future.length > 0;

  $: canLoadPreset = Boolean(
    selectedPresetId && presets.some((preset) => preset.id === selectedPresetId)
  );
  $: canDeletePreset = Boolean(
    canLoadPreset && selectedPresetId && !isDefaultPreset(selectedPresetId)
  );
  $: canSavePreset = Boolean(newPresetName.trim());
</script>

<section class="designer mat-designer">
  <MatDesignerHeader
    matWidth={matWidth}
    matHeight={matHeight}
    unit={unit}
    unitOptions={unitOptions}
    previewScale={previewScale}
    minSize={minSize}
    canUndo={canUndo}
    canRedo={canRedo}
    onMatWidthChange={handleMatWidthChange}
    onMatHeightChange={handleMatHeightChange}
    onUnitChange={handleUnitChange}
    onUndo={undo}
    onRedo={redo}
    onPrint={printLayout}
    presets={presets}
    selectedPresetId={selectedPresetId}
    newPresetName={newPresetName}
    canLoadPreset={canLoadPreset}
    canDeletePreset={canDeletePreset}
    canSavePreset={canSavePreset}
    onPresetSelect={handlePresetSelect}
    onPresetLoad={loadSelectedPreset}
    onPresetDelete={deleteSelectedPreset}
    onPresetNameInput={handlePresetNameInput}
    onPresetSave={savePreset}
  />

  <div class="layout">
    <div class="controls">
      <div class="control-group">
        <WindowTable
          windows={windows}
          selectedIdSet={selectedIdSet}
          selectedCount={selectedCount}
          minSize={minSize}
          addWindow={addWindow}
          removeSelected={removeSelected}
          toggleSelection={toggleSelection}
          updateWindow={updateWindow}
          altKey={altKey}
        />
      </div>
      <div class="control-group">
        <ArrangeControls
          selectedCount={selectedCount}
          alignSelected={alignSelected}
          centerSelected={centerSelected}
          distribute={distribute}
        />
      </div>
    </div>
    <div class="preview-area">
      <MatPreviewPanel
        bind:containerWidth={previewContainerWidth}
        positionedWindows={positionedWindows}
        matDimensions={matDimensions}
        extraDimensions={extraDimensions}
        unit={unit}
        scaledMatWidth={scaledMatWidth}
        scaledMatHeight={scaledMatHeight}
        selectedIdSet={selectedIdSet}
        formatMeasurement={formatMeasurement}
        matWidth={matWidth}
        matHeight={matHeight}
        clearSelection={clearSelection}
        toggleSelection={toggleSelection}
        altKey={altKey}
        handleKeyActivate={handleKeyActivate}
        selectedCount={selectedCount}
      />
    </div>
  </div>
</section>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background: #fafafa;
    color: #1f2937;
  }

  .designer {
    display: flex;
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 720px;
  }

  .preview-area {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .control-group {
    display: flex;
    padding: 1rem;
    background: #fff;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    box-shadow: none;
    flex-direction: column;
    gap: 0.75rem;
  }

  :global(.mat-designer button) {
    padding: 0.4rem 0.7rem;
    border-radius: 0.375rem;
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 0.9rem;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  :global(.mat-designer button:disabled) {
    background: #f3f4f6;
    border-color: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  :global(.mat-designer button:not(:disabled):hover) {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  :global(.mat-designer button.secondary) {
    background: #fff;
    color: #1f2937;
    border-color: #d1d5db;
  }

  :global(.mat-designer button.secondary:disabled) {
    background: #f9fafb;
    border-color: #e5e7eb;
    color: #9ca3af;
  }

  :global(.mat-designer button.secondary:not(:disabled):hover) {
    background: #f3f4f6;
    border-color: #cbd5f5;
  }

  :global(.mat-designer input[type='number']),
  :global(.mat-designer input[type='text']),
  :global(.mat-designer select) {
    padding: 0.4rem 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #fff;
    font: inherit;
    font-size: 0.95rem;
  }

  :global(.mat-designer input[type='number']:focus),
  :global(.mat-designer input[type='text']:focus),
  :global(.mat-designer select:focus) {
    outline: 2px solid #2563eb;
    outline-offset: 1px;
  }

  @media (max-width: 640px) {
    .designer {
      padding: 1rem 0.75rem;
    }

    .layout {
      gap: 1.25rem;
    }

    .controls {
      gap: 0.75rem;
    }

    .control-group {
      padding: 0.75rem;
    }
  }

  @media print {
    :global(.mat-designer) {
      background: #fff;
      color: #000;
    }

    :global(.mat-designer header),
    :global(.mat-designer .controls),
    :global(.mat-designer .history-actions),
    :global(.mat-designer .clear-selection) {
      display: none !important;
    }

    .designer {
      padding: 0;
      max-width: none;
    }

    .layout {
      display: block;
    }

    :global(.mat-designer .mat-container) {
      overflow: visible !important;
      padding: 0;
    }

    :global(.mat-designer .mat) {
      box-shadow: none;
    }
  }
</style>


