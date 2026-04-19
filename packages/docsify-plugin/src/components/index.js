// Component barrel — exports all default components as a named map.
// Registration is the caller's responsibility (e.g. createPlugin({ components })).

import { DarkContainer, HeaderBar, TypeBadge, RequiredBadge, Chevron, SectionLabel } from './shared.js';
import { EntitySchema } from './entity-schema.js';
import { CardGrid } from './card-grid.js';
import { ApiEndpoint } from './api-endpoint.js';
import { StatusFlow } from './status-flow.js';
import { ConfigExample } from './config-example.js';
import { DirectiveTable } from './directive-table.js';
import { StepType } from './step-type.js';
import { SideBySide } from './side-by-side.js';
import { FileTree } from './file-tree.js';

export const defaultComponents = {
  'entity-schema':   EntitySchema,
  'card-grid':       CardGrid,
  'api-endpoint':    ApiEndpoint,
  'status-flow':     StatusFlow,
  'config-example':  ConfigExample,
  'directive-table': DirectiveTable,
  'step-type':       StepType,
  'side-by-side':    SideBySide,
  'file-tree':       FileTree,
  'dark-container':  DarkContainer,
  'header-bar':      HeaderBar,
  'type-badge':      TypeBadge,
  'required-badge':  RequiredBadge,
  'chevron':         Chevron,
  'section-label':   SectionLabel,
};

export { Tabs } from './tabs.js';
export { CodeBlock } from './code-block.js';
export { processRegionDirectives } from './region-toggle.js';
