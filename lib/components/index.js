// Component entry point — imports all components and registers them with the engine.
// This is the ONLY file that calls register(). Components just export their function.

import { registerAll } from '../core/registry.js';

// Shared building blocks (must load first — other components import from here)
import { DarkContainer, HeaderBar, TypeBadge, RequiredBadge, Chevron, SectionLabel } from './shared.js';

// Preact fence components
import { EntitySchema } from './entity-schema.js';
import { CardGrid } from './card-grid.js';
import { ApiEndpoint } from './api-endpoint.js';
import { StatusFlow } from './status-flow.js';
import { ConfigExample } from './config-example.js';
import { DirectiveTable } from './directive-table.js';
import { StepType } from './step-type.js';
import { SideBySide } from './side-by-side.js';
import { FileTree } from './file-tree.js';

// Register all fence components (fence name → component)
registerAll({
  'entity-schema': EntitySchema,
  'card-grid': CardGrid,
  'api-endpoint': ApiEndpoint,
  'status-flow': StatusFlow,
  'config-example': ConfigExample,
  'directive-table': DirectiveTable,
  'step-type': StepType,
  'side-by-side': SideBySide,
  'file-tree': FileTree,
});

// Register shared building blocks (used by components internally, also in registry for side-by-side)
registerAll({
  'dark-container': DarkContainer,
  'header-bar': HeaderBar,
  'type-badge': TypeBadge,
  'required-badge': RequiredBadge,
  'chevron': Chevron,
  'section-label': SectionLabel,
});

// Classic components (not fence components — imported directly by adapter)
export { Tabs } from './tabs.js';
export { CodeBlock } from './code-block.js';
export { processRegionDirectives } from './region-toggle.js';
