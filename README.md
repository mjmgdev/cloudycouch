# CloudyCouch Studio

<p align="center">
  <img src="https://img.shields.io/badge/IBM_Cloudant-Compatible-0f62fe?style=for-the-badge&logo=ibm&logoColor=white" alt="Cloudant" />
  <img src="https://img.shields.io/badge/Apache_CouchDB-Compatible-e42528?style=for-the-badge&logo=apache&logoColor=white" alt="CouchDB" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>A modern, high-performance database management studio and web console for IBM Cloudant and Apache CouchDB.</strong>
</p>

---

## 🌟 Overview

**CloudyCouch Studio** is a developer-first web interface designed to streamline inspecting, querying, and managing IBM Cloudant and Apache CouchDB instances. Built with React 19 and Express, it provides instant visibility into your databases, rapid document editing, visual index management, query building, multi-tab document peeking, and deep storage analytics.

Whether you're developing locally, querying production datasets, or experimenting offline in the built-in **Interactive Sandbox**, CloudyCouch Studio delivers a fluid, responsive, and beautiful database cockpit.

---

## ✨ Features

### 🔌 Flexible Connection Management
- **IBM Cloud IAM Authentication**: Connect securely to IBM Cloudant using IAM API Keys.
- **Basic Auth (Username & Password)**: Connect directly to self-hosted or cloud-based Apache CouchDB instances.
- **Environment Auto-Detection**: Automatically reads credentials from `.env` in development mode for instant zero-prompt connection.
- **Zero-Setup Offline Sandbox**: Fully functional interactive mock mode with sample multi-partition databases and documents — test queries and features without configuring a live database.
- **Live Latency & Health Indicator**: Real-time ping counter, node version info, and masked endpoint security display.

### 📄 Document Explorer & Management
- **High-Performance Pagination**: Smooth browsing with customizable page sizes (25, 50, 100, 200).
- **ID Prefix Search**: Instantly filter documents by `_id` prefix (e.g. partition keys like `user:` or `order:`).
- **Fast Column Inspector**: Dynamically inspect document fields and preview raw JSON values.
- **Revision History**: Track revisions (`_rev`) with conflict awareness and tombstone tracking.
- **Bulk Operations**: Multi-select documents for batch deletion or bulk modifications.

### 👁️ Multi-Tab "Peek Document" Modal
- **Non-Destructive Inspection**: Peek into any document without navigating away from your active query or document list.
- **Tabbed Browsing**: Open and switch between multiple peeked documents simultaneously in tabs.
- **Inline Editing & Saving**: Modify JSON payload directly within the peek modal with instant save capability.
- **Wildcard Database Switcher**: Type and filter databases using wildcard syntax (e.g. `billing*2026*` or `prod*users*`).
- **Context-Menu & Shortcuts**: Highlight any ID anywhere in the app and press <kbd>Alt</kbd> + <kbd>P</kbd> (or <kbd>Alt</kbd> + <kbd>F12</kbd>), or right-click to peek.
- **Fullscreen Mode**: Expand to full viewport for comprehensive JSON inspection.

### ✍️ CodeMirror Document Editor
- **Full JSON Editing**: Syntax highlighting, code folding, auto-formatting, and linting powered by CodeMirror.
- **Conflict Prevention**: Automatic `_rev` mismatch detection preventing accidental overwrites.
- **Revision Tree Browser**: View previous revisions and status flags (`available`).
- **Quick Cloning**: Duplicate existing documents into new records with a single click.

### 🔍 Query Studio
- **Dual Query Interface**:
  - **Visual Builder**: Build selector criteria without memorizing query operator syntax.
  - **Raw JSON Editor**: Write and run complex queries with full `$eq`, `$gt`, `$in`, `$regex`, `$and`, `$or` operators.
- **Execution Statistics**: View real-time query execution metrics including `execution_time_ms`, `total_docs_examined`, and results count.
- **Bookmarks & Paging**: Supports deep pagination using Cloudant/CouchDB query bookmarks.

### 📑 Index Manager
- **Design Document Inspector**: View all active indexes across `_all_docs` and custom design documents.
- **Create Indexes**: Add new JSON or text indexes with custom field arrays and partition support.
- **Index Cleanup**: Safely delete unused or redundant design document indexes.

### 📊 Storage & Partition Analytics
- **Visual Storage Rollups**: Gain instant insight into database disk consumption and tombstone document counts.
- **Intelligent Grouping Modes**:
  - **Project Rollup**: Consolidate databases stripping temporal suffixes (e.g. `app_2026_01` → `app`).
  - **Yearly Buckets**: Group partitioned/sharded databases by calendar year.
  - **Segment Prefixes**: Group by first or second naming segment delimiter.
  - **Custom Regex**: Define arbitrary regex extraction patterns for bespoke naming conventions.
- **Export Reports**: Export database storage summaries to JSON or CSV for capacity planning.

### 📦 Bulk Import & Export
- **Import Datasets**: Upload JSON arrays or Newline Delimited JSON (NDJSON) files with bulk write validation.
- **Export Data**: Download complete databases or filtered query result sets as formatted JSON files.

### 🎨 Polished UI & UX
- **Theme Support**: Seamless Dark and Light modes with persistent user preference.
- **Collapsible Sidebar**: Maximize screen estate with <kbd>Ctrl</kbd> + <kbd>B</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd>.
- **Mobile Responsive**: Adaptive layout optimized for tablet and desktop viewports.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` or `pnpm` / `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mjmgdev/cloudycouch.git
   cd CloudyCouch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include your Cloudant or CouchDB credentials:
   ```env
   # Cloudant Account URL
   CLOUDANT_URL=https://your-instance.cloudantnosqldb.appdomain.cloud

   # Authentication Option A: IBM Cloud IAM API Key (Recommended)
   CLOUDANT_APIKEY=your_iam_api_key_here

   # Authentication Option B: Username & Password (CouchDB / Legacy)
   CLOUDANT_USERNAME=
   CLOUDANT_PASSWORD=

   # Backend Port
   PORT=3001
   ```
   > **Note:** If you do not configure a `.env` file, you can enter credentials directly in the web UI or launch the **Interactive Sandbox** to test instantly.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   This command starts both the Express backend (`localhost:3001`) and Vite frontend (`localhost:5173`) concurrently.

5. **Open CloudyCouch Studio:**
   Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs both backend and frontend development servers concurrently |
| `npm run dev:frontend` | Starts only the Vite frontend dev server |
| `npm run dev:backend` | Starts only the Express backend with `--watch` automatic restart |
| `npm run build` | Builds optimized production static bundle in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm start` | Starts the production Express server |

---

## ⚙️ Configuration Reference

| Variable | Description | Default |
|---|---|---|
| `CLOUDANT_URL` | Cloudant or CouchDB instance endpoint (e.g. `https://xxx.cloudantnosqldb.appdomain.cloud`) | `""` |
| `CLOUDANT_APIKEY` | IBM Cloud IAM API Key for Cloudant authentication | `""` |
| `CLOUDANT_USERNAME` | Username for CouchDB Basic Authentication | `""` |
| `CLOUDANT_PASSWORD` | Password for CouchDB Basic Authentication | `""` |
| `PORT` | Port for the Express API server | `3001` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>B</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd> | Toggle Sidebar collapsed / expanded |
| <kbd>Alt</kbd> + <kbd>P</kbd> | Peek document from selected text or open Peek modal |
| <kbd>Alt</kbd> + <kbd>F12</kbd> | Alternative shortcut to Peek Document |
| <kbd>Esc</kbd> | Close topmost open modal or drawer (with stacked modal awareness) |

---

## 🏗️ Project Architecture

```text
CloudyCouch/
├── server/                    # Express API Backend
│   ├── index.js               # REST API endpoints & mock simulation routing
│   ├── cloudantClient.js      # Native IBM Cloudant / CouchDB HTTP client wrapper
│   └── mockData.js            # Sample datasets for offline sandbox mode
├── src/                       # React 19 Frontend
│   ├── api/
│   │   └── cloudantApi.js     # Frontend API client
│   ├── components/            # UI Components
│   │   ├── ConnectionScreen.jsx # Credential setup & Sandbox launcher
│   │   ├── CreateDbModal.jsx    # Create database dialog
│   │   ├── DocumentEditor.jsx   # CodeMirror JSON editor & revision inspector
│   │   ├── DocumentTable.jsx    # Paginated documents table & bulk actions
│   │   ├── Header.jsx           # Top navigation bar, status, theme toggle
│   │   ├── ImportExportModal.jsx# Dataset import/export utility
│   │   ├── IndexManager.jsx     # Index manager & design docs
│   │   ├── PeekContextMenu.jsx  # Floating quick peek context menu
│   │   ├── PeekModal.jsx        # Multi-tab document peek modal
│   │   ├── QueryBuilder.jsx     # Visual & raw query studio
│   │   ├── Sidebar.jsx          # Database selector & view navigation
│   │   ├── StorageAnalytics.jsx # Storage rollups, graphs & grouping engine
│   │   └── Toast.jsx            # Notification toast system
│   ├── utils/
│   │   ├── helpers.js           # Wildcard matching, formatters, utilities
│   │   └── modalStack.js        # Stack-aware modal escape handler
│   ├── App.jsx                # Main application coordinator
│   ├── index.css              # Design system & dark/light theme CSS tokens
│   └── main.jsx               # Application entry point
├── package.json
└── vite.config.js
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mjmgdev/cloudycouch/issues).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
