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

- **Security labels:** select **First floor** or **Second floor** to see numbered feature names with arrows anchored to the equipment. The first floor has ten callouts and the second has nine, covering cameras, access controls, locked storage, alarms, the main-door motion sensor and fire exit; the eight ground-floor window grilles share one callout. Stair rails remain in the model without callouts. Use the feature selector to focus on one item, or **All security features** to restore the floor diagram. Smaller screens show one feature at a time. The **Security labels** button switches the callouts off or on; from the exterior or walkthrough it opens a labeled floor view. Callouts stay hidden during the indoor walkthrough so doors and equipment remain easy to operate.
- Select **Enter barangay hall** for an eye-level indoor walkthrough.
- **Captain’s private meeting room:** the RFID-controlled **Left Upper Wing** contains a rounded oak table with six matching navy upholstered chairs, aligned writing pads and stationery, a flat meeting-zone rug, a rear wall presentation display, a low supplies cabinet with two manually opening doors and neatly shelved folders, two corner plants and a linear ceiling light. The table is set back from the entrance, leaving the front cross-aisle and side circulation clear. Use a Captain demo card at the Upper Wing reader, then select **Left Upper Wing** to enter facing the meeting table.
- All eight ground-floor windows have exterior dark-steel security grilles with perimeter frames, evenly spaced vertical bars, a central rail and mounting brackets. Each grille fits its window and follows the existing facade cutaways. Grilles are limited to the ground-floor windows, with the main doors and rear fire exit clear.
- The Captain's office has an additional front-facing window on the left when viewed from outside. Its high sill clears the storage cupboard and files. Inside, pleated ivory curtains are gathered at both sides with tiebacks, hanging from a metal rod and rings. The window is a real opening with tinted glazing and navy trims, and its curtains follow the front-wall cutaway. The office nameplate is above the window; the clock and RFID reader keep their positions.
- **RFID access demo:** the two pictured second-floor doors control entry to the **Session Hall** and the **Left Upper Wing**. Open **RFID access**, choose a virtual card, and use **Go to … reader**. Click/tap the wall reader, or aim and press **E**. A **Staff** card opens the Session Hall; the **Captain** card opens both rooms. **Visitor** and **Expired** cards are denied. Authorized scans turn the reader green and open its door for eight seconds, then it closes/relocks once the doorway is clear. Changing cards revokes previous entry grants. Room shortcuts lead to the reader until entry is authorized, and walking into a restricted room also requires a valid grant, even if its door is already open. Anyone already inside can use the door to exit without a card. The shared office/stair landing and rear fire exit remain accessible. This is a 3D access-control simulation using virtual cards, not real RFID hardware, identity authentication, or protection of confidential data on GitHub Pages.
- The main entrance has a walk-through **security detector simulation**. Open **Entrance security**, select **No weapon**, **Gun**, or **Knife**, and select **Go to detector**. Walk forward through the arch with WASD or the on-screen arrows. A clear scan turns the indicators green; a selected gun or knife turns them red and activates the existing warning lights on both floors. Use **Reset demo & alarm**, or the first-floor emergency button, before another alarm test. Selecting another item alone does not clear an alert. The selected item is captured when the scan begins, and outward movement or room shortcuts do not trigger scans. This demonstrates virtual item detection only; it does not inspect real people, weapons, or webcam images.
- Use **WASD** or the **arrow keys** to walk. Hold **Shift** to walk faster.
- Drag on the view to look around. Press **L** on desktop to lock the mouse for continuous looking; **Esc** releases it so you can select room buttons.
- Click a nearby door, drawer or cabinet front to open it, and click again to close. You can also aim at it and press **E** or use the displayed **Open / Close** button. A gold outline indicates the object within reach. Doors stay closed until you operate them, and closed room doors block passage.
- The yellow **EMERGENCY** call point is between the rear-wall windows on the first floor. Click/tap its red button, or aim and press **E**, to activate the red warning lights on both floors, a looping siren and the emergency alert banner. Use the same button again to reset and stop the sound. The lights pulse together once per second, or stay steadily lit when reduced motion is enabled. The alarm remains active as you visit rooms and appears in the live CCTV feeds.
- **Entrance motion alarm:** a modeled motion sensor above the inside of the main door detects the virtual visitor moving near the entrance and activates the same siren and warning lights, including when no weapon is selected. Enter the hall, then walk forward from the entrance to try it. Looking around, standing still, floor overview cameras and room shortcuts do not trigger it. Reset using the emergency call point or **Entrance security → Reset demo & alarm**; the motion sensor has a three-second cooldown after reset. This detects movement within the 3D model, without a webcam or real-world sensor.
- The **speaker button** at the top mutes/unmutes alarm audio while leaving the warning lights active. Sound becomes available after your first click, tap or keypress, according to browser audio rules. The siren is generated locally with Web Audio and pauses when the browser tab is hidden. Resetting the alarm stops it entirely.
- Desk drawers and the filing cabinet slide out with modeled sides, bases and documents inside. The captain's cabinet doors swing on hinges. Each part opens independently and keeps its state as you visit rooms.
- **Locked records cabinets:** the Tanod filing cabinet and the Captain's front-wall storage start locked. Click/tap their gold **DEMO KEY** lock, or aim at it and press **E**, to unlock. Open a drawer using its handle, or a cupboard panel, then select a labeled sample file to read it. Close the document with **Esc** or its close button. Close all compartments before turning the key to lock again. Both locks work independently. These demonstrate cabinet locks within the model; they are not authentication or secure storage for real documents.
- The cabinets contain eight readable fictional examples: resident registry, clearance applications, Tanod incident log, Lupon mediation files, barangay resolutions, budget records, emergency response plans and property inventory. Every document is marked as a sample; no real resident or official information is included.
- **Fire exit:** follow the green floor arrows to the push-bar door in the middle of the rear wall on the first floor. Click the door/push bar, aim and press **E**, or tap the action button to swing it outward and walk onto the rear landing. It opens independently of cabinet locks and the alarm, and cannot close while someone is in its doorway. The upstairs sign directs visitors down the existing stairs to this exit. The door opens through an actual wall opening, with a clear threshold and collision-aware landing.
- On a touchscreen, drag to look, tap nearby objects to operate them, and hold the on-screen direction buttons to move.
- Use the room buttons to visit **Public Assistance**, the **Tanod Office**, **Lupon Mediation**, the **Session Hall**, the **Captain’s Office**, or the **Left Upper Wing**. These position you inside the room facing its furnishings. The upper wing also connects to the hall through a doorway beside the captain’s office. Left means the left side when facing the main entrance.
- The captain's office is enclosed by a full-height glazed partition that joins the front and rear exterior walls. Open the hinged office door to pass between the office/stair landing and the session hall; there is no side passage around it.
- In the **Captain's Office**, the desk, belongings and storage sit on the left beside the glass partition. The captain's chair occupies the former visitor-chair position on the front side of the desk, facing into the room. Two visitor chairs sit beside the plant on the right. The right-wall display shows five labeled live CCTV feeds: first floor, second floor, front exterior, back exterior and the separate upper room. Walk closer to inspect the channels. Door and drawer movement and day/evening lighting changes appear in the feeds. These are rendered views of this 3D scene; no webcam access, real surveillance streams or recording service is used.
- You can also walk along the ground-floor aisle to the 2.2 m-wide stairs, climb to the clear 1.35 m-deep rear upstairs landing, and descend again. The captain's office has no sofa or coffee table beside the walkway. Walls, room partitions, furniture and stair rails constrain movement.
- The upper-wing RFID reader faces into the Captain's office from the front wall between the clock and the upper-wing entrance, with clear space around its sign. **Go to Upper Wing reader** positions you directly in front of it. The foreground mediation chair and its collision boundary have been removed from the aisle across the foot of the stairs, leaving five seats at the table.
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
  SecurityDetector.js     Entrance screening arch, virtual item selection and alarm integration
  RecordsViewer.js        Readable sample documents and accessible document dialog
  AccessControl.js        Virtual RFID cards, wall readers, restricted rooms and timed door locks
  SecurityLabels.js       Floor-specific feature callouts, projected arrows and focus controls
  AlarmAudio.js           Gesture-unlocked procedural siren, mute and audio lifecycle
  EntranceMotion.js       Main-door motion sensor and virtual-visitor movement detection
  style.css               Responsive blue interface and touch controls
  models/
    AdminBuilding.js      Blue hall, roof, doors and cutaways
    LeftAnnex.js          Raised photo-inspired wing and its open passage
    PrivateMeetingRoom.js Six-seat meeting layout, wall display and operable supplies cabinet
    InteriorDetails.js    Furnished rooms, stairs and navigation metadata
    InteractiveFurniture.js  Drawer trays, hinged panels and object metadata
    CCTVEquipment.js      Procedural CCTV camera bodies and office monitoring screen
    EmergencySystem.js    Pressable emergency call point and two synchronized red beacons
    RecordsCabinet.js     Independent demo key locks and fictional sample records
    FireExit.js           Outward-opening rear push-bar door, signage and exit landing
    WindowGrille.js       Exterior steel grilles fitted to ground-floor windows
    WindowCurtains.js     Pleated ivory curtains, tiebacks, rod and curtain rings
    HallLayout.js         Shared stairs, captain's workspace and office enclosure dimensions
    primitives.js         Shared materials and geometry/sign helpers
```

The hall measures 12 × 8 m with a roof crest 6.5 m above its base. Interior floor heights are 0.16 m and 3.03 m; the walkthrough camera stands 1.6 m above the floor. Its walls are medium blue `#3478c6`; the roof and trims are navy `#1e4f85`.

Static geometry is batched by material, the sun uses PCFSoftShadowMap, and reduced-motion preferences disable camera transition animations. CCTV channels share a half-float render target; updates are staggered, with up to 10 frames/second per channel near the office and 2 elsewhere, subject to device performance. Feed captures restore the full building envelope without altering the visitor's selected cutaway, manual door state or shadow settings. `window.bucana` exposes the scene, camera, hall, walkthrough, `cctv`, `enterHall(roomId)`, `visitRoom(id)`, `selectView(view, immediate)` and `setLighting(night)` for inspection.
