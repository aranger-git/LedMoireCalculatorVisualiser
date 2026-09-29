# References: files for Claude to build from

Put manufacturer spec sheets, gear photos and sample plans here. Claude reads them when it updates the tool, e.g. to add a tile or fix a lens's aperture curve.

## How to upload (no command line)

1. On github.com, open this `references/` folder.
2. Click **Add file**, then **Upload files**.
3. Drag in your PDFs or photos, then click **Commit changes**.
4. In the chat, tell Claude what you uploaded and what it's for (e.g. "J33 barrel photo, fix the aperture").

| Folder | What goes in it |
|---|---|
| `specs/` | Manufacturer spec sheets: LED tiles, cameras, lenses (PDF) |
| `photos/` | Photos of lens barrels, rating plates, tile backs (JPG/PNG) |

## ⚠️ Client files don't go here

If this repo is **public**, anyone can see everything in it. **Never upload client plans, drawings, contracts or pricing here.**

For a client's floor plan, use one of these instead:
- **In the app:** the 3D view has an "Importer un plan" button. The file stays on your device and is never uploaded.
- **In the chat:** drop the file into the conversation with Claude.
