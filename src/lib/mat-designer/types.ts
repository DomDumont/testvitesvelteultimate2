export type Unit = 'mm' | 'cm' | 'in';

export type MatWindow = {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EditableWindowKey = 'name' | 'x' | 'y' | 'width' | 'height';

export type MatDesignerState = {
  matWidth: number;
  matHeight: number;
  unit: Unit;
  windows: MatWindow[];
  selectedIds: number[];
  idCounter: number;
};

export type MatPreset = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  state: MatDesignerState;
};

export type DimensionPosition = 'above' | 'below' | 'left' | 'right';

export type PositionedWindow = MatWindow & {
  scaledX: number;
  scaledY: number;
  scaledWidth: number;
  scaledHeight: number;
  horizontal: {
    left: number;
    top: number;
    length: number;
    position: 'above' | 'below';
  };
  vertical: {
    left: number;
    top: number;
    length: number;
    position: 'left' | 'right';
  };
};

export type MatDimensionOverlay = {
  horizontal: { left: number; top: number; length: number };
  vertical: { left: number; top: number; length: number };
};

export type ExtraDimension = {
  id: string;
  orientation: 'horizontal' | 'vertical';
  left: number;
  top: number;
  length: number;
  label: string;
  modifier: 'margin' | 'spacing';
};
