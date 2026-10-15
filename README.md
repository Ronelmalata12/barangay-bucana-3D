# Barangay Bucana

A self-contained Three.js model of a two-storey blue barangay hall in Nasugbu, Batangas. The hall has an attached raised upper wing on its left, modeled after the supplied photo with pale blue walls, two front jalousie windows, stone-clad columns, an open passage underneath and a navy gable roof. Five CCTV cameras send live scene views to a monitoring screen in the captain's office. The scene uses a neutral backdrop for shadows. Its geometry, furniture and signs are procedural; no external models, textures or fonts are required.

This is a concept visualization based on the supplied brief, rather than a surveyed reconstruction.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev -- --host --open
```

Open http://localhost:5173/ or the address Vite prints. On Windows PowerShell where npm.ps1 is blocked, use `npm.cmd` instead of `npm`. Keep the development terminal running; Ctrl+C stops it.

```sh
npm run build
npm run preview -- --host --open
```

The production files are generated in `dist/`.

## Publish on GitHub Pages

The repository contains an automatic GitHub Pages workflow at `.github/workflows/deploy.yml`. Vite uses relative asset URLs, so the application works under your repository's Pages address without editing a repository name into the code.

1. Sign in to GitHub and create a **public** repository, for example `barangay-bucana`. Select **Add a README file** so the repository starts with a `main` branch.
2. Open the repository's **Settings → Pages**. Set the **Source** under **Build and deployment** to **GitHub Actions**.
3. Open **Code → Add file → Upload files**. From inside this project folder, drag these items into the upload area: `.github/`, `.gitignore`, `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, and `README.md`. Commit them to `main`. Upload the selected contents directly at the repository root so `package.json` and `index.html` appear immediately in its file list. Leave `node_modules/`, `dist/`, and `.qa/` on your computer.
4. Open **Actions** and wait for **Deploy Barangay Bucana to GitHub Pages** to show a successful run. It installs dependencies, builds the application and publishes `dist/`.
5. Return to **Settings → Pages** and select **Visit site**. The address will normally be `https://YOUR-USERNAME.github.io/barangay-bucana/` (using your actual username and repository name). The published app runs in visitors' browsers, so your local terminal can be closed.

To update the app later, commit updated source files to `main`; the workflow publishes a new build. If you enable Pages after uploading the files, open **Actions → Deploy Barangay Bucana to GitHub Pages → Run workflow** to start deployment again. A red workflow result means deployment failed; open that run's failed step to read the error.

Official guides: [GitHub Pages for Vite](https://vite.dev/guide/static-deploy.html#github-pages), [uploading files to GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Visit the hall

- Select **Enter barangay hall** for an eye-level indoor walkthrough.
- Use **WASD** or the **arrow keys** to walk. Hold **Shift** to walk faster.
- Drag on the view to look around. Press **L** on desktop to lock the mouse for continuous looking; **Esc** releases it so you can select room buttons.
- Click a nearby door, drawer or cabinet front to open it, and click again to close. You can also aim at it and press **E** or use the displayed **Open / Close** button. A gold outline indicates the object within reach. Doors stay closed until you operate them, and closed room doors block passage.
- The yellow **EMERGENCY** call point is between the rear-wall windows on the first floor. Click/tap its red button, or aim and press **E**, to activate the red warning lights on both floors and the emergency alert banner. Use the same button again to reset. The lights pulse together once per second, or stay steadily lit when reduced motion is enabled. The alarm remains active as you visit rooms and appears in the live CCTV feeds. This is a visual alarm within the 3D model.
- Desk drawers and the filing cabinet slide out with modeled sides, bases and documents inside. The captain's cabinet doors swing on hinges. Each part opens independently and keeps its state as you visit rooms.
- On a touchscreen, drag to look, tap nearby objects to operate them, and hold the on-screen direction buttons to move.
- Use the room buttons to visit **Public Assistance**, the **Tanod Office**, **Lupon Mediation**, the **Session Hall**, the **Captain’s Office**, or the **Left Upper Wing**. These position you inside the room facing its furnishings. The upper wing also connects to the hall through a doorway beside the captain’s office. Left means the left side when facing the main entrance.
- In the **Captain's Office**, the desk, belongings and storage sit on the left beside the glass partition. The captain's chair occupies the former visitor-chair position on the front side of the desk, facing into the room. Two visitor chairs sit beside the plant on the right. The right-wall display shows five labeled live CCTV feeds: first floor, second floor, front exterior, back exterior and the separate upper room. Walk closer to inspect the channels. Door and drawer movement and day/evening lighting changes appear in the feeds. These are rendered views of this 3D scene; no webcam access, real surveillance streams or recording service is used.
- You can also walk along the ground-floor aisle to the 2.2 m-wide stairs, climb to the clear 1.35 m-deep rear upstairs landing, and descend again. The captain's office has no sofa or coffee table beside the walkway. Walls, room partitions, furniture and stair rails constrain movement.
- Select **Exterior view** to leave the walkthrough. Exterior, first-floor and second-floor camera buttons also return to orbit controls, with cutaways for the floor views.
- Outside, drag to orbit, scroll/pinch to zoom, and right-drag/two-finger drag to pan.
- Keys **1–3** select exterior/floor cameras; **N** switches day/evening lighting; **Home** returns outside.
- View settings control exterior rotation, sun shadows and the exterior roof. Indoor walkthroughs keep the building enclosed and its room lights on.

## Source

```text
index.html
package.json
vite.config.js
.github/workflows/deploy.yml
public/favicon.svg
src/
  main.js                 Scene, camera modes, lighting and UI
  Walkthrough.js          First-person look, movement, collisions and stairs
  Interactions.js         Visitor-operated doors, drawers, picking and animation
  CCTVSystem.js           Five live scene feeds, shared GPU atlas and monitor labels
  style.css               Responsive blue interface and touch controls
  models/
    AdminBuilding.js      Blue hall, roof, doors and cutaways
    LeftAnnex.js          Raised photo-inspired wing and its open passage
    InteriorDetails.js    Furnished rooms, stairs and navigation metadata
    InteractiveFurniture.js  Drawer trays, hinged panels and object metadata
    CCTVEquipment.js      Procedural CCTV camera bodies and office monitoring screen
    EmergencySystem.js    Pressable emergency call point and two synchronized red beacons
    HallLayout.js         Shared stair dimensions and captain's workspace position
    primitives.js         Shared materials and geometry/sign helpers
```

The hall measures 12 × 8 m with a roof crest 6.5 m above its base. Interior floor heights are 0.16 m and 3.03 m; the walkthrough camera stands 1.6 m above the floor. Its walls are medium blue `#3478c6`; the roof and trims are navy `#1e4f85`.

Static geometry is batched by material, the sun uses PCFSoftShadowMap, and reduced-motion preferences disable camera transition animations. CCTV channels share a half-float render target; updates are staggered, with up to 10 frames/second per channel near the office and 2 elsewhere, subject to device performance. Feed captures restore the full building envelope without altering the visitor's selected cutaway, manual door state or shadow settings. `window.bucana` exposes the scene, camera, hall, walkthrough, `cctv`, `enterHall(roomId)`, `visitRoom(id)`, `selectView(view, immediate)` and `setLighting(night)` for inspection.
