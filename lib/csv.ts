/** Quote CSV text and keep untrusted token metadata from becoming spreadsheet formulas. */
export function csvCell(value:unknown){let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
