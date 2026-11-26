/**
 * Whether the page on screen holds changes not saved yet. A form sets it; whatever would throw the page away without a
 * navigation (the profile switcher) asks first.
 */
let unsaved = false

export const setUnsaved = (value: boolean) => {
  unsaved = value
}

export const hasUnsaved = () => unsaved
