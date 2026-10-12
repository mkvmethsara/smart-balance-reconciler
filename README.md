# Smart Balance Reconciler

Smart Balance Reconciler is a privacy-first personal finance ledger for tracking income, expenses, borrowed money, and money lent to others. It compares the balance calculated from your ledger with your actual bank or wallet balance so missing transactions are easier to find.

## Features

- Track income, expenses, borrowed money, and money lent to friends
- Record repayments from friends or repayments made to friends, reducing the outstanding amount
- Reconcile the calculated balance against your real balance
- View monthly spending by category
- Local ledger with newest transactions first
- Export and import JSON or CSV data
- Store data locally; no account or server is required
- Run as a Windows desktop app or as a local web app

## Screenshots

Add screenshots of the dashboard here before sharing the project publicly.

## Download for Windows

Open the [Releases](https://github.com/mkvmethsara/smart-balance-reconciler/releases) page and download either:

- **Portable EXE** - run the app without installing it
- **Setup EXE** - install the app through the Windows installer

## Run from source

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the Electron app:

```powershell
npm install
npm start
```

To create Windows portable and installer builds:

```powershell
npm run dist
```

The generated files are written to the `build/` directory and are intentionally ignored by Git. Upload them to a GitHub Release rather than committing large binaries to the source repository.

## Data and privacy

Transaction data is kept in the app's local storage on the device where it was entered. The project does not include a backend or analytics service. The spending chart loads Chart.js from jsDelivr when internet access is available; the rest of the ledger remains usable without it.

Use the export controls regularly if the data is important. Exported files contain your financial information and should be stored securely.

## Technology

- HTML, CSS, and vanilla JavaScript
- Electron
- Chart.js
- Electron Builder

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
