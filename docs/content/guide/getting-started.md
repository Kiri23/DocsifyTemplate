---
type: tutorial
time: 10 min
difficulty: beginner
outcome: A documentation page with a data model, API endpoint, and status flow — all from YAML
---

# Getting Started

In this tutorial, we'll build a Task API reference page using three interactive components. By the end, you'll have a working documentation page with a data model, an API endpoint, and a status flow diagram — all from YAML in markdown.

### Step 1: Set up the project

```bash
git clone https://github.com/your-org/docsify-template.git my-docs
cd my-docs
npm install
npm run serve
```

The output looks something like:

```
Serving /my-docs/docs at http://localhost:3009
```

Open `http://localhost:3009/docs/` in your browser. You'll see the documentation site with a sidebar and home page.

### Step 2: Create the page

Let's create a new markdown file for our Task API docs. Create `docs/content/guide/task-api.md` with this content:

```markdown
# Task API

A task represents a unit of work that moves through review stages.
```

Now add it to the sidebar. Open `docs/_sidebar.md` and add this line:

```markdown
* [Task API](/content/guide/task-api)
```

Refresh your browser and click "Task API" in the sidebar. You'll see the heading and description we just wrote.

### Step 3: Add the data model

Now we'll add our first component. Components are YAML written inside a code fence — the fence language tells DocsifyTemplate which component to render.

Add this below the description in `task-api.md`:

````markdown
## Data Model

```entity-schema
name: "Task"
fields:
  - name: "title"
    type: "string"
    required: true
    description: "Short summary of the task."
  - name: "status"
    type: "enum"
    required: true
    description: "Current stage in the workflow."
    values: ["draft", "in-review", "approved", "archived"]
  - name: "assignee"
    type: "string"
    description: "Username of the person responsible."
  - name: "createdAt"
    type: "datetime"
    required: true
    description: "When the task was created."
```
````

Refresh the browser. Notice that the YAML has become a styled schema card with expandable fields. Click on a field row to see its description and allowed values.

### Step 4: Add an API endpoint

Let's document how to create a task. Add this below the data model:

````markdown
## Create a Task

```api-endpoint
method: "POST"
path: "/api/v1/tasks"
description: "Create a new task in draft status."
params:
  - name: "title"
    type: "string"
    required: true
  - name: "assignee"
    type: "string"
    required: false
response: |
  {
    "id": "tsk_001",
    "title": "Write onboarding guide",
    "status": "draft",
    "assignee": null,
    "createdAt": "2026-03-30T10:00:00Z"
  }
```
````

Refresh the browser. Notice the green `POST` badge and the collapsible section — click the endpoint header to expand the parameter list and example response.

### Step 5: Add a status flow

The last component shows how tasks move between states. Add this at the bottom of the page:

````markdown
## Task Lifecycle

```status-flow
states:
  - id: "draft"
    label: "Draft"
    trigger: "Task is created"
    next: ["in-review"]
    effects: ["Assign default reviewer"]
  - id: "in-review"
    label: "In Review"
    trigger: "Author submits for review"
    next: ["approved", "draft"]
    effects: ["Notify reviewer", "Lock editing"]
  - id: "approved"
    label: "Approved"
    trigger: "Reviewer approves"
    next: ["archived"]
    effects: ["Notify author", "Mark as complete"]
  - id: "archived"
    label: "Archived"
    trigger: "Task is archived after completion"
    effects: ["Remove from active list"]
```
````

Refresh the browser. You should see a row of colored state buttons. Click any state to see its triggers, transitions, and side effects.

### What we built

You now have a working documentation page with three interactive components:

- **Entity schema** — expandable data model with fields, types, and validation rules
- **API endpoint** — collapsible endpoint with method badge, parameters, and response
- **Status flow** — clickable state machine with transitions and side effects

All of it came from YAML in markdown — no JavaScript, no build step.

### Next steps

- [Components Reference](/content/guide/components-reference) — full YAML API for all components
- [How to create a tabbed page](/content/howto/create-tabbed-page) — split pages into Quick Start and Technical Reference tabs
- [Creating Components](/content/guide/creating-components) — build your own components
