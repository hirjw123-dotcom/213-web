# Theme Guide: Tactical Grid System

This guide defines the design system for the 213web-ver2 application. The design philosophy is **"Clean, Flat, Data-First"**, inspired by Excel spreadsheets and military tactical interfaces. It prioritizes information density, high contrast, and rapid scanning over decorative elements.

## 1. Core Philosophy

*   **No Rounding**: All `border-radius` values are `0` (except for circles like spinners).
*   **No Shadows**: Drop shadows are removed to maintain a flat, paper-like aesthetic. `box-shadow` is used *strictly* for simulating borders in sticky contexts.
*   **High Contrast**: Text is primarily absolute black (`#000`) or dark charcoal (`#444`) on white backgrounds.
*   **Grid Layout**: Every element should feel like it aligns to a rigorous grid. Borders are 1px solid.

## 2. Color Palette (CSS Variables)

Colors are defined in `src/@css/index.css`.

| Variable | Hex Value | Role | Usage |
| :--- | :--- | :--- | :--- |
| `--c1` | `#2e3b2f` | **Deep Slate / Olive** | Main accent, active states, thick borders, headers. |
| `--c2` | `#000000` | **Black** | Primary text, strong borders. |
| `--c3` | `#444444` | **Dark Grey** | Secondary text. |
| `--c4` | `#666666` | **Medium Grey** | Tertiary text, disabled states. |
| `--c5` | `#999999` | **Mid-Light Grey** | Standard component borders (inputs, cards). |
| `--c6` | `#cccccc` | **Light Grey** | Subtle borders, table grid lines. |
| `--c7` | `#e0e0e0` | **Pale Grey** | Hover backgrounds, tab backgrounds. |
| `--c8` | `#f0f0f0` | **Off-White** | Table headers, secondary areas. |
| `--c9` | `#ffffff` | **White** | Main content backgrounds, inputs. |
| `--accent` | `#1976d2` | **Tactical Blue** | Focus states, selection highlights. |
| `--err` | `#d32f2f` | **Alert Red** | Error states, dangerous actions. |
| `--highlight` | `rgba(25, 118, 210, 0.1)` | **Selection Overlay** | Selected rows, active items. |

## 3. Typography

*   **Font**: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif.
*   **Size**: Base is `13px` (dense). Headers are `14px` (bold). Small text is `12px` or `11px`.
*   **Weight**: Normal (400) for data, Bold (700) for headers and keys.

## 4. Component Rules

### Buttons
*   **Shape**: Rectangular (`border-radius: 0`).
*   **Border**: 1px solid `--c5`.
*   **Background**: `--c8` (default), `--c9` (secondary), `--c1` (primary badge/toggle).
*   **State**: Darken border/bg on hover. **No text shadow, no box shadow.**

### Inputs
*   **Shape**: Rectangular.
*   **Border**: 1px solid `--c5`. Focus state uses `outline: 2px solid var(--accent)` with `outline-offset: -1px`.
*   **Background**: `--c9` (White).

### Tables (Critical)
To manage complex data with sticky headers/columns, we use a specific **"Separate Collapse with Box-Shadow"** technique.

*   `border-collapse: separate`
*   `border: none` on the table itself.
*   **Cells (`td`, `th`)**:
    *   Do **NOT** use `border` proper for internal grid lines if `sticky` is involved (it causes collapse issues).
    *   Use `box-shadow` to simulate borders:
        ```css
        /* Standard Cell Border (Bottom & Left) */
        box-shadow: inset 0 -1px 0 var(--c6), inset -1px 0 0 var(--c6);
        ```
*   **Headers (`th`)**:
    *   Background: `--c8`.
    *   Font: 12px, Bold.
    *   Padding: `6px 4px`.
*   **Sticky Columns**:
    *   Require specific `box-shadow` layering to ensure the "border" moves with the cell.
    *   `z-index`: 300 for headers, 10 for sticky columns.

### Modals
*   **Overlay**: `rgba(0, 0, 0, 0.4)`.
*   **Window**: `--c9` background, **1px solid `--c2`** (strong border).
*   **Shadow**: Minimal `box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1)`.
*   **Header**: `--c8` background, 1px bottom border.

## 5. Development Checklist
When creating new screens:
1.  [ ] Import `index.css`.
2.  [ ] Set container background to `--bg` or `--c9`.
3.  [ ] Use flexbox utilities (`.f`, `.row`, `.ajCenter`) for layout.
4.  [ ] Avoid inline styles for colors; use `var(--c*)`.
5.  [ ] Ensure **no rounded corners** on any new UI element.
