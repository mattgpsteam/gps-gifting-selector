# Embedding the selector on gpspromotions.com

`/embed/` is the selector built for a frame on GPS's own site. It differs from
the main page in four ways:

- **No lead gate.** The site collects leads with its own form.
- **It sizes itself.** The page tells the parent page its height on every
  screen, so the frame never scrolls inside itself.
- **It hands over the result.** On gpspromotions.com (and www.) only, the
  frame passes the recommendation and the selector's Session ID to the parent
  page, so the site's form can send them along with the lead.
- **Its rows are tagged.** Source ends in ` (embed)`, and a finished run gets
  Status `Website embed` in Airtable instead of `Reached form`.

`embed/index.html` is built by `node tools/build.js`, like `sales/`. Never edit
it by hand.

## Paste this on the page

```html
<div data-gps-selector></div>
<script src="https://gifting-selector.gpspromotions.com/embed/embed.js" async></script>
```

Optional attributes on the div: `data-min-height="640"` (the height before the
page reports in) and `data-title` (the frame's accessible name).

## Hooking up the site's form

Either of these works. You can use both.

**Hidden fields.** Any input on the page with `data-gps-selector-field` gets
filled in when the visitor reaches a recommendation:

```html
<input type="hidden" name="selector_session" data-gps-selector-field="sessionId">
<input type="hidden" name="selector_result"  data-gps-selector-field="result">
<input type="hidden" name="selector_score"   data-gps-selector-field="score">
```

**Event.** The div fires a `gps-selector:result` event that bubbles up the page.
Its `detail` is `{ sessionId, result, score, answers }`, where `answers` maps a
question id to the label the visitor picked:

```js
document.addEventListener('gps-selector:result', (e) => {
  console.log(e.detail.result, e.detail.sessionId);
});
```

The Session ID matches the `Session ID` column in the Airtable Responses table.
Save it with the lead and you can look up that visitor's full answers.

## Notes

- Only GPS's own site gets the answers. Any other site that frames `/embed/`
  still gets the frame height, but no result.
- The "Case Study" button opens the strategy brief in a new tab. It doesn't
  replace the frame's contents.
- Some site builders strip `<script>` tags. If yours does, a plain
  `<iframe src="https://gifting-selector.gpspromotions.com/embed/" style="width:100%;height:1100px;border:0">`
  still runs the selector, but it won't resize or hand over results.
