// Presentation only. Never derive save keys, package IDs or URLs from these labels.
// A later naming PR changes this object, then runs npm run sync:display-name.
const display=Object.freeze({name:'戦線指揮',subtitle:'FIELD COMMAND',manifestSuffix:' SRPG'});
export const DISPLAY_NAME=Object.freeze({
 title:display.subtitle?`${display.name} — ${display.subtitle}`:display.name,
 about:display.subtitle?`${display.name} / ${display.subtitle}`:display.name,
 manifestName:display.name+display.manifestSuffix,
 shortName:display.name
});
