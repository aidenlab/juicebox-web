# jQuery Removal Plan

This is independent of the Vite migration. jQuery removal is its own modernization
task and should land first. This codebase is old, jQuery is no longer carrying its
weight, and removing it sets a cleaner foundation for the build-tool migration.

## Scope (decided 2026-05-07)

**App code only.** Bootstrap 4 stays. jQuery stays loaded on the page (BS4 needs
it; DataTables needs it). What changes is *our authored JavaScript*: every `$()`
call in `js/initializationHelper.js` and `js/contactMapLoad.js` is rewritten to
vanilla DOM, except at two unavoidable seam points where we call into
`igv-widgets` factories that demand jQuery objects.

**Why not Bootstrap 5 / a full purge?** A short-lived attempt at Phase 1 (BS4 →
BS5) revealed that the upgrade leaks into vendor packages — `data-modal` and
`igv-widgets` both emit BS4 markup (`class="close"`, `data-dismiss`,
`data-toggle`), so a Bootstrap 5 page breaks every modal those libs render. A
real BS5 upgrade requires coordinated changes across `igv-widgets` and
`data-modal` (both igvteam org). That's filed as a follow-up; not in scope here.

## Constraint: the seam

Two `igv-widgets` factories require jQuery objects as inputs:

- `createTrackWidgetsWithTrackRegistry($(container), $trackDropdownMenu, $('#hic-local-track-file-input'), ...)` — `js/initializationHelper.js:50`
- `createSessionWidgets($(container), ...)` — `js/initializationHelper.js:448`

These two call sites keep using `$()`. Mark with `// TODO(jquery-purge): remove
when igv-widgets accepts DOM elements`. Everywhere else in our code, `$` goes
away. Net effect: jQuery stops being a tool *we reach for* and becomes glue at
a known boundary.

## Inventory (where jQuery lives today)

- `index.html:28` — jQuery 3.3.1 slim CDN tag (stays)
- `index.html:30` — Bootstrap 4 (stays; needs jQuery)
- `index.html:36` — DataTables 1.10 CSS+JS (stays; needs jQuery)
- `js/initializationHelper.js` — ~47 `$` call sites → reduce to 2 (the seam)
- `js/contactMapLoad.js` — ~8 `$` call sites → reduce to 0
- `js/qrcode.js` — vanilla; docstring URL is the only mention. No code changes needed.

## Phase 1 — Cleanse `js/contactMapLoad.js` (~8 sites, easy)

| Current | Replacement |
|---|---|
| `$dropdowns.on('show.bs.dropdown', fn)` | `dropdowns.forEach(el => el.addEventListener('show.bs.dropdown', fn))` (BS4 dispatches these as native events too — they bubble through jQuery's handler list AND the native event loop) |
| `$(this).children('.dropdown-toggle')` | `e.currentTarget.querySelector('.dropdown-toggle')` |
| `$child.attr('id')` | `child.id` |
| `$localFileInputs.on('change', fn)` | `addEventListener` per element |
| `$(this).get(0).files` | `e.currentTarget.files` |
| `$(this).val('')` | `e.currentTarget.value = ''` |
| `$dropboxButtons.on('click', fn)` | `addEventListener` per element |
| `$googleDriveButtons.parent().hide()` | `el.parentElement.style.display = 'none'` |
| `$(root).append(html)` | `root.insertAdjacentHTML('beforeend', html)` |
| `$(root).find('#'+id)` | `root.querySelector('#'+id)` |
| `$modal.find('input').on('change', ...)` | `modal.querySelector('input').addEventListener('change', ...)` |
| `$(this).val()` | `e.currentTarget.value` |
| `$('#'+id).modal('hide')` | Still needs jQuery (Bootstrap 4 modal API is jQuery-based). Two options: (a) pass through a `$` reference at the seam, or (b) use the Bootstrap 4 native event: `document.getElementById(id).dispatchEvent(new Event('click'))` won't work — easiest is to keep one `$('#'+id).modal('hide')` call and document it as a BS4 dependency. |

Update the function signature: callers pass plain DOM elements / NodeLists
instead of jQuery collections. This cascades into `initializationHelper.js`.

**Seam carve-out:** Bootstrap 4 modal control (`.modal('hide')`,
`.modal('show')`) is jQuery-only. Treat this like the igv-widgets seam — keep a
narrow `import $ from 'jquery'` (or rely on the global, since the `<script>`
tag stays) and use `$` *only* for those calls, not for DOM lookups or event
binding. The win is that `$` stops being our default tool; it's reserved for
specific BS4 plugin invocations.

## Phase 2 — Cleanse `js/initializationHelper.js` (~47 sites)

Same translation table as Phase 1, plus:

- `$('a[id$=-map-dropdown]').parent()` → `Array.from(document.querySelectorAll('a[id$=-map-dropdown]')).map(a => a.parentElement)`
- `$dropdowns.find('input')` → `dropdowns.flatMap(el => Array.from(el.querySelectorAll('input')))`
- `.removeClass('disabled')` → `.classList.remove('disabled')`
- `.empty()` → `el.replaceChildren()`
- `.append($('<option ...>'))` → `el.insertAdjacentHTML('beforeend', '<option ...>')`
- `.text().trim()` → `.textContent.trim()`
- `.data('url')` → `.dataset.url`
- `.val()` / `.val(x)` → `.value`
- `$container.height()` → `container.getBoundingClientRect().height`
- `.on('shown.bs.dropdown', fn)` / `.on('show.bs.modal', fn)` / `.on('hidden.bs.modal', fn)` → BS4 dispatches these as jQuery events only by default; verify they fire as native DOM events too. If they don't, this stays jQuery (another seam carve-out).
- `.toggle()` / `.hide()` → `style.display = ''` / `style.display = 'none'`

**Two unavoidable seam sites kept on jQuery:**

- `createTrackWidgetsWithTrackRegistry($(container), ...)` at line 50
- `createSessionWidgets($(container), ...)` at line 448

Plus any BS4-plugin invocations (`.modal('hide')`, `.modal('show')`, etc.) that
aren't replaceable with native DOM. Keep these contained, comment each.

## Phase 3 — Verification

- Manual smoke test of every UI path: load a contact map (each source —
  Juicebox archive, ENCODE, 4DN, local, URL), open each modal, trigger each
  dropdown, share URL flow, QR code, embed snippet, session save/load,
  track loading.
- Grep guard: `grep -rn "\\$(" --include='*.js' js/` should show only the
  documented seams.

## Deferred / follow-up

1. **Bootstrap 4 → 5 upgrade.** Requires coordinated changes in `data-modal`
   and `igv-widgets` to drop BS4 markup. Multi-repo effort.
2. **`igv-widgets` factory signatures**: accept plain DOM elements instead of
   jQuery objects. Eliminates the seam in `initializationHelper.js:50, :448`.
3. **DataTables 2.x**: evaluate the no-jQuery migration path.
4. After (1)–(3) land, jQuery exits the runtime entirely.

## Commit cadence

One PR per phase. Phases 1 and 2 are mechanical and easy to review.
