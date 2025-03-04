# Server-Memory MCP Tools: Cursor Rule for Project Structure Tracking

This document outlines how to use the server-memory MCP tools effectively to track your project structure, dependencies, and improve overall project understanding. Below are descriptions and usage guidelines for each tool:

## Overview

The server-memory MCP tools allow you to construct and maintain a knowledge graph of your project. You can represent project components (e.g., modules, files, functions) as entities, define dependencies and relationships between them, and add contextual observations to provide additional insights. Use the following commands within your development workflow:

## Tools and Usage

### 1. create_entities

- **Purpose:** Add new nodes to the knowledge graph representing project components (files, modules, libraries, etc.).
- **Usage:** Invoke this tool when a new project component is introduced. Specify key attributes such as name, type, and metadata.

### 2. create_relations

- **Purpose:** Define relationships between two entities (for example, dependency, composition, association).
- **Usage:** Use this tool to capture how entities are connected. For dependencies, indicate which component relies on which.

### 3. add_observations

- **Purpose:** Record observations or annotations about a particular entity or relation.
- **Usage:** Add context like version info, deprecation notes, architectural comments, or known issues.

### 4. delete_entities

- **Purpose:** Remove outdated or incorrect entities from the graph.
- **Usage:** Use this tool when a project component is removed or significantly refactored such that it should no longer appear in the graph.

### 5. delete_observations

- **Purpose:** Remove obsolete or irrelevant observations linked to an entity or relation.
- **Usage:** Keep the data current by clearing out observations that no longer apply.

### 6. delete_relations

- **Purpose:** Delete relationships that are no longer valid.
- **Usage:** Use this command to update the graph when dependencies change or components are removed.

### 7. read_graph

- **Purpose:** Retrieve and display the current state of the knowledge graph.
- **Usage:** Run this tool to get an overview of the project structure and review existing entities and their relationships.

### 8. search_nodes

- **Purpose:** Query the graph for specific nodes by attributes, names, or types.
- **Usage:** Utilize this tool to quickly locate project components and inspect their details.

### 9. open_nodes

- **Purpose:** Drill down into specific nodes for detailed information and context.
- **Usage:** Use this tool to explore the internals of a node, including its relationships and observations.

## Best Practices for Maximizing Project Understanding

- **Incremental Updates:** Regularly update the knowledge graph as new components are added, and old ones modified or removed.
- **Document Relationships:** Clearly define dependencies to simplify the process of impact analysis during refactoring.
- **Contextual Observations:** Annotate entities with observations that capture versioning, known limitations, and integration points.
- **Regular Reviews:** Use read_graph and search_nodes frequently to assess the overall project health and structure.
- **Automation:** Consider integrating these commands into your continuous integration processes to maintain an up-to-date project map.

Following these guidelines will help ensure that your project's architecture is transparent, maintainable, and well-documented.
