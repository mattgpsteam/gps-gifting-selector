# Embedding the selector on gpspromotions.com

`/embed/` is the selector built for a frame on GPS's own site. It works like the
main page, with these differences:

- **The lead gate is GPS's HubSpot form** (portal 42297193, form
  `24a5f996-e733-4ec7-9fb8-911b630108c9`, region na2), not our own form. The
  result stays hidden until HubSpot confirms the submission. The lead lands in
  HubSpot along with its workflows, owner notification and consent records.
- **The submission is still logged here.** Name, email, phone, company and the
  tradeshow answer go to selector-log, and from there to Airtable. That puts the
  person in the same row as their answers. Job title and interests live only in
  HubSpot.
- **It sizes itself.** The page tells the parent page its height on every
  screen, including after the HubSpot form loads. The frame never scrolls inside
  itself.
- **Its rows are tagged.** Source ends in ` (embed)`. Status works the same as on
  the main page: `Reached form` means the visitor saw the HubSpot form but didn't
  submit it.

`embed/index.html` is built by `node tools/build.js`, like `sales/`. Never edit
it by hand. To switch to a different HubSpot form, change `HS_FORM` in
`source/selector.template.html` and rebuild.

## Paste this on the page

```html
<div data-gps-selector></div>
<script src="https://gifting-selector.gpspromotions.com/embed/embed.js" async></script>
```

Optional attributes on the div: `data-min-height="640"` (the height before the
page reports in) and `data-title` (the frame's accessible name).

## Optional: the recommendation on the HubSpot contact

Add two single-line-text contact properties in HubSpot,
`gifting_selector_result` and `gifting_selector_session`. Then add both to the
form as **hidden** fields. The selector fills them in automatically, so every
contact shows which model they were recommended, plus the Session ID to look up
their full answers in Airtable. Until those fields exist, nothing changes.

## Optional: conversion tracking on the site

After a HubSpot submit, the div fires a `gps-selector:result` event that bubbles
up the page, with `detail` set to `{ sessionId, result, score }`:

```js
document.addEventListener('gps-selector:result', (e) => {
  // e.g. fire a GA / ad-platform conversion here
});
```

Only gpspromotions.com and www.gpspromotions.com receive this event. Any other
site that frames `/embed/` gets the frame height, but nothing else.

## Notes

- The "Case Study" button opens the updated PDF brief for that result
  (`embed/case-studies/`) in a new tab. It doesn't replace the frame's
  contents. The main page and `/sales` still link the HTML briefs in
  `strategy/`. To swap a PDF, replace the file and keep its name.
- Some site builders strip `<script>` tags. If yours does, a plain
  `<iframe src="https://gifting-selector.gpspromotions.com/embed/" style="width:100%;height:1700px;border:0">`
  still works, gate included. It just won't resize.
